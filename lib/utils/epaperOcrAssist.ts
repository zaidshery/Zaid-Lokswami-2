import fs from 'fs/promises';
import path from 'path';
import {
  type EPaperArticleHotspot,
  normalizeArticleHotspots,
} from '@/lib/utils/epaperHotspots';

interface OcrWord {
  WordText?: string;
  Left?: number;
  Top?: number;
  Width?: number;
  Height?: number;
}

interface OcrLine {
  LineText?: string;
  Words?: OcrWord[];
}

interface OcrParsedResult {
  TextOverlay?: {
    Lines?: OcrLine[];
  };
}

interface OcrApiResponse {
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  ErrorDetails?: string | string[];
  ParsedResults?: OcrParsedResult[];
}

interface CustomOcrLineInput {
  text?: string;
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
}

interface CustomOcrResponse {
  success?: boolean;
  error?: string;
  message?: string;
  hotspots?: unknown;
  lines?: unknown;
}

interface LineBox {
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  height: number;
}

interface TextBlock {
  lines: LineBox[];
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function getErrorString(message: unknown) {
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string') return message;
  return '';
}

function resolvePreferredLanguage() {
  const configured = (process.env.OCR_SPACE_LANGUAGE || '').trim().toLowerCase();
  const fallback = 'hin';
  const candidate = configured || fallback;
  if (/^[a-z]{3}$/.test(candidate)) return candidate;
  return fallback;
}

function isInvalidLanguageError(message: string) {
  return /E201/i.test(message) || /parameter\s+'?language'?\s+is\s+invalid/i.test(message);
}

function resolveCustomOcrUrl() {
  return (process.env.OCR_CUSTOM_API_URL || '').trim();
}

function resolveCustomOcrApiKey() {
  return (process.env.OCR_CUSTOM_API_KEY || '').trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function overlapRatio(aLeft: number, aRight: number, bLeft: number, bRight: number) {
  const left = Math.max(aLeft, bLeft);
  const right = Math.min(aRight, bRight);
  if (right <= left) return 0;

  const overlap = right - left;
  const minWidth = Math.max(1, Math.min(aRight - aLeft, bRight - bLeft));
  return overlap / minWidth;
}

function buildLineBoxes(response: OcrApiResponse): LineBox[] {
  const lineBoxes: LineBox[] = [];
  const parsed = Array.isArray(response.ParsedResults) ? response.ParsedResults : [];

  for (const result of parsed) {
    const lines = Array.isArray(result?.TextOverlay?.Lines) ? result.TextOverlay!.Lines! : [];
    for (const line of lines) {
      const words = Array.isArray(line.Words) ? line.Words : [];
      const wordBoxes = words
        .map((word) => {
          const left = Number(word.Left);
          const top = Number(word.Top);
          const width = Number(word.Width);
          const height = Number(word.Height);
          if (
            !Number.isFinite(left) ||
            !Number.isFinite(top) ||
            !Number.isFinite(width) ||
            !Number.isFinite(height) ||
            width <= 0 ||
            height <= 0
          ) {
            return null;
          }
          return {
            left,
            top,
            right: left + width,
            bottom: top + height,
          };
        })
        .filter(Boolean) as Array<{ left: number; top: number; right: number; bottom: number }>;

      if (!wordBoxes.length) continue;

      const text =
        (typeof line.LineText === 'string' ? line.LineText : '')
          .replace(/\s+/g, ' ')
          .trim();
      if (!text) continue;

      const left = Math.min(...wordBoxes.map((w) => w.left));
      const top = Math.min(...wordBoxes.map((w) => w.top));
      const right = Math.max(...wordBoxes.map((w) => w.right));
      const bottom = Math.max(...wordBoxes.map((w) => w.bottom));
      const height = bottom - top;
      if (height <= 0) continue;

      lineBoxes.push({ text, left, top, right, bottom, height });
    }
  }

  return lineBoxes.sort((a, b) => (a.top === b.top ? a.left - b.left : a.top - b.top));
}

function toLineBox(value: unknown): LineBox | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as CustomOcrLineInput;

  const text = String(source.text || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const left = Number(source.left);
  const top = Number(source.top);
  const rightFromInput = Number(source.right);
  const bottomFromInput = Number(source.bottom);
  const width = Number(source.width);
  const height = Number(source.height);

  const right = Number.isFinite(rightFromInput)
    ? rightFromInput
    : Number.isFinite(left) && Number.isFinite(width)
      ? left + width
      : Number.NaN;

  const bottom = Number.isFinite(bottomFromInput)
    ? bottomFromInput
    : Number.isFinite(top) && Number.isFinite(height)
      ? top + height
      : Number.NaN;

  if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(right) || !Number.isFinite(bottom)) {
    return null;
  }
  if (right <= left || bottom <= top) return null;

  return {
    text,
    left,
    top,
    right,
    bottom,
    height: bottom - top,
  };
}

function groupLinesToBlocks(lines: LineBox[]): TextBlock[] {
  const blocks: TextBlock[] = [];

  for (const line of lines) {
    let bestIndex = -1;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      const vGap = line.top - block.bottom;
      const hOverlap = overlapRatio(block.left, block.right, line.left, line.right);
      const threshold = Math.max(14, line.height * 1.35);
      if (vGap > threshold) continue;
      if (hOverlap < 0.24) continue;

      const score = Math.max(vGap, 0) + (1 - hOverlap) * 10;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    if (bestIndex === -1) {
      blocks.push({
        lines: [line],
        left: line.left,
        top: line.top,
        right: line.right,
        bottom: line.bottom,
      });
      continue;
    }

    const block = blocks[bestIndex];
    block.lines.push(line);
    block.left = Math.min(block.left, line.left);
    block.top = Math.min(block.top, line.top);
    block.right = Math.max(block.right, line.right);
    block.bottom = Math.max(block.bottom, line.bottom);
  }

  return blocks;
}

function blocksToHotspots(blocks: TextBlock[], pageWidth: number, pageHeight: number) {
  const candidates = blocks
    .map((block, index) => {
      const text = block.lines.map((line) => line.text).join('\n').trim();
      const title = block.lines[0]?.text?.trim() || '';
      const widthPx = block.right - block.left;
      const heightPx = block.bottom - block.top;
      const areaPx = widthPx * heightPx;
      return { block, text, title, areaPx, index };
    })
    .filter((item) => item.text.length >= 55 && item.areaPx >= 5000);

  candidates.sort((a, b) => b.areaPx - a.areaPx);
  const selected = candidates.slice(0, 30);

  const hotspots: EPaperArticleHotspot[] = selected.map((item, index) => {
    const paddingPx = 4;
    const left = clamp(item.block.left - paddingPx, 0, pageWidth);
    const top = clamp(item.block.top - paddingPx, 0, pageHeight);
    const right = clamp(item.block.right + paddingPx, 0, pageWidth);
    const bottom = clamp(item.block.bottom + paddingPx, 0, pageHeight);

    const x = clamp((left / pageWidth) * 100, 0, 100);
    const y = clamp((top / pageHeight) * 100, 0, 100);
    const width = clamp(((right - left) / pageWidth) * 100, 0.1, 100);
    const height = clamp(((bottom - top) / pageHeight) * 100, 0.1, 100);

    return {
      id: `auto-${index + 1}`,
      title: item.title.slice(0, 180),
      text: '',
      page: 1,
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      width: Number(width.toFixed(3)),
      height: Number(height.toFixed(3)),
    };
  });

  return normalizeArticleHotspots(hotspots);
}

function guessMimeFromFileName(name: string) {
  const ext = path.extname(name).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return null;
}

async function resolveImageInput(thumbnail: string) {
  const source = thumbnail.trim();
  if (!source) throw new Error('Thumbnail is required for OCR assist');

  if (source.toLowerCase().startsWith('data:image/')) {
    return { mode: 'base64' as const, value: source };
  }

  if (/^https?:\/\//i.test(source)) {
    return { mode: 'url' as const, value: source };
  }

  if (source.startsWith('/')) {
    const localPath = path.join(process.cwd(), 'public', source.replace(/^\/+/, ''));
    const mime = guessMimeFromFileName(localPath);
    if (!mime) {
      throw new Error('Only image thumbnails are supported for OCR assist');
    }
    const data = await fs.readFile(localPath);
    return {
      mode: 'base64' as const,
      value: `data:${mime};base64,${data.toString('base64')}`,
    };
  }

  throw new Error('Unsupported thumbnail URL for OCR assist');
}

async function requestOcrSpace(
  imageInput: { mode: 'url' | 'base64'; value: string },
  apiKey: string,
  language: string
) {
  const form = new FormData();
  form.append('apikey', apiKey);
  form.append('language', language);
  form.append('OCREngine', '2');
  form.append('isOverlayRequired', 'true');
  form.append('detectOrientation', 'true');
  form.append('scale', 'true');

  if (imageInput.mode === 'url') {
    form.append('url', imageInput.value);
  } else {
    form.append('base64Image', imageInput.value);
  }

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    let details = '';
    try {
      const payload = (await response.json()) as OcrApiResponse;
      details =
        getErrorString(payload.ErrorMessage) || getErrorString(payload.ErrorDetails) || '';
    } catch {
      try {
        details = (await response.text()).trim();
      } catch {
        details = '';
      }
    }

    if (response.status === 403) {
      throw new Error(
        details ||
          'OCR request denied (403). Set a valid OCR_SPACE_API_KEY in .env.local and restart.'
      );
    }

    throw new Error(
      details ? `OCR request failed with status ${response.status}: ${details}` : `OCR request failed with status ${response.status}`
    );
  }

  const data = (await response.json()) as OcrApiResponse;
  if (data.IsErroredOnProcessing || data.OCRExitCode !== 1) {
    const message = getErrorString(data.ErrorMessage) || 'OCR could not parse this page';
    throw new Error(message);
  }

  return data;
}

async function callCustomOcr(
  imageInput: { mode: 'url' | 'base64'; value: string },
  language: string
) {
  const endpoint = resolveCustomOcrUrl();
  if (!endpoint) return null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const apiKey = resolveCustomOcrApiKey();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      image: imageInput.value,
      mode: imageInput.mode,
      language,
    }),
  });

  let payload: CustomOcrResponse = {};
  try {
    payload = (await response.json()) as CustomOcrResponse;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message =
      getErrorString(payload.error) ||
      getErrorString(payload.message) ||
      `Custom OCR request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (Array.isArray(payload.hotspots)) {
    return {
      hotspots: normalizeArticleHotspots(payload.hotspots),
      source: 'hotspots' as const,
    };
  }

  const rawLines = Array.isArray(payload.lines) ? payload.lines : [];
  if (!rawLines.length) {
    throw new Error(
      'Custom OCR response must include `hotspots` or `lines` array'
    );
  }

  const lines = rawLines
    .map((item) => toLineBox(item))
    .filter(Boolean) as LineBox[];

  if (!lines.length) {
    return { hotspots: [], source: 'lines' as const };
  }

  const pageWidth = Math.max(...lines.map((line) => line.right));
  const pageHeight = Math.max(...lines.map((line) => line.bottom));
  if (!Number.isFinite(pageWidth) || !Number.isFinite(pageHeight) || pageWidth <= 0 || pageHeight <= 0) {
    return { hotspots: [], source: 'lines' as const };
  }

  const blocks = groupLinesToBlocks(
    lines.sort((a, b) => (a.top === b.top ? a.left - b.left : a.top - b.top))
  );
  return {
    hotspots: blocksToHotspots(blocks, pageWidth, pageHeight),
    source: 'lines' as const,
  };
}

async function callOcrSpace(imageInput: { mode: 'url' | 'base64'; value: string }) {
  const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld';
  const preferredLanguage = resolvePreferredLanguage();

  try {
    return await requestOcrSpace(imageInput, apiKey, preferredLanguage);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (preferredLanguage !== 'eng' && isInvalidLanguageError(message)) {
      return requestOcrSpace(imageInput, apiKey, 'eng');
    }
    throw error;
  }
}

export async function generateArticleHotspotsFromThumbnail(thumbnail: string) {
  const imageInput = await resolveImageInput(thumbnail);
  const preferredLanguage = resolvePreferredLanguage();

  const customResult = await callCustomOcr(imageInput, preferredLanguage);
  if (customResult) {
    return customResult.hotspots;
  }

  const ocrResponse = await callOcrSpace(imageInput);
  const lines = buildLineBoxes(ocrResponse);
  if (!lines.length) return [];

  const pageWidth = Math.max(...lines.map((line) => line.right));
  const pageHeight = Math.max(...lines.map((line) => line.bottom));
  if (!Number.isFinite(pageWidth) || !Number.isFinite(pageHeight) || pageWidth <= 0 || pageHeight <= 0) {
    return [];
  }

  const blocks = groupLinesToBlocks(lines);
  return blocksToHotspots(blocks, pageWidth, pageHeight);
}
