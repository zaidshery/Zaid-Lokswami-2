'use client';

import {
  normalizeArticleHotspots,
  type EPaperArticleHotspot,
} from '@/lib/utils/epaperHotspots';

const TESSERACT_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

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

interface TesseractBBox {
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
}

interface TesseractLine {
  text?: string;
  bbox?: TesseractBBox;
}

interface TesseractData {
  lines?: TesseractLine[];
  width?: number;
  height?: number;
}

interface TesseractResult {
  data?: TesseractData;
}

interface TesseractGlobal {
  recognize: (
    image: string,
    lang: string,
    options?: { logger?: (message: unknown) => void }
  ) => Promise<TesseractResult>;
}

declare global {
  interface Window {
    Tesseract?: TesseractGlobal;
  }
}

let loadPromise: Promise<TesseractGlobal> | null = null;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function loadTesseract() {
  if (typeof window === 'undefined') {
    throw new Error('Local OCR is available only in browser');
  }

  if (window.Tesseract) return window.Tesseract;

  if (!loadPromise) {
    loadPromise = new Promise<TesseractGlobal>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-tesseract-loader="1"]'
      );

      const onReady = () => {
        if (!window.Tesseract) {
          reject(new Error('Failed to initialize local OCR'));
          return;
        }
        resolve(window.Tesseract);
      };

      if (existing) {
        existing.addEventListener('load', onReady, { once: true });
        existing.addEventListener(
          'error',
          () => reject(new Error('Failed to load local OCR script')),
          { once: true }
        );
        return;
      }

      const script = document.createElement('script');
      script.src = TESSERACT_SCRIPT_URL;
      script.async = true;
      script.dataset.tesseractLoader = '1';
      script.onload = onReady;
      script.onerror = () => reject(new Error('Failed to load local OCR script'));
      document.head.appendChild(script);
    }).catch((error) => {
      loadPromise = null;
      throw error;
    });
  }

  return loadPromise;
}

function buildLineBoxes(result: TesseractResult) {
  const rawLines = Array.isArray(result?.data?.lines) ? result.data!.lines! : [];
  const lines: LineBox[] = [];

  for (const rawLine of rawLines) {
    const text = String(rawLine?.text || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;

    const bbox = rawLine?.bbox || {};
    const left = Number(bbox.x0);
    const top = Number(bbox.y0);
    const right = Number(bbox.x1);
    const bottom = Number(bbox.y1);

    if (
      !Number.isFinite(left) ||
      !Number.isFinite(top) ||
      !Number.isFinite(right) ||
      !Number.isFinite(bottom)
    ) {
      continue;
    }
    if (right <= left || bottom <= top) continue;

    lines.push({
      text,
      left,
      top,
      right,
      bottom,
      height: bottom - top,
    });
  }

  return lines.sort((a, b) => (a.top === b.top ? a.left - b.left : a.top - b.top));
}

function overlapRatio(aLeft: number, aRight: number, bLeft: number, bRight: number) {
  const left = Math.max(aLeft, bLeft);
  const right = Math.min(aRight, bRight);
  if (right <= left) return 0;

  const overlap = right - left;
  const minWidth = Math.max(1, Math.min(aRight - aLeft, bRight - bLeft));
  return overlap / minWidth;
}

function groupLinesToBlocks(lines: LineBox[]) {
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
    .map((block) => {
      const text = block.lines.map((line) => line.text).join('\n').trim();
      const title = block.lines[0]?.text?.trim() || '';
      const widthPx = block.right - block.left;
      const heightPx = block.bottom - block.top;
      const areaPx = widthPx * heightPx;
      return { block, text, title, areaPx };
    })
    .filter((item) => item.text.length >= 40 && item.areaPx >= 4000);

  candidates.sort((a, b) => b.areaPx - a.areaPx);
  const selected = candidates.slice(0, 40);

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
      id: `local-${index + 1}`,
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

export async function generateArticleHotspotsLocally(
  imageSource: string,
  options?: { language?: string }
) {
  const source = imageSource.trim();
  if (!source) {
    throw new Error('Thumbnail is required for local OCR');
  }
  if (/\.pdf(\?|#|$)/i.test(source) || source.toLowerCase().startsWith('data:application/pdf')) {
    throw new Error('Local OCR requires image input (JPG/PNG/data URL)');
  }

  const tesseract = await loadTesseract();
  const preferredLanguage = (options?.language || 'hin+eng').trim() || 'hin+eng';

  let result: TesseractResult;
  try {
    result = await tesseract.recognize(source, preferredLanguage, { logger: () => {} });
  } catch {
    if (preferredLanguage !== 'eng') {
      result = await tesseract.recognize(source, 'eng', { logger: () => {} });
    } else {
      throw new Error('Local OCR failed to recognize image');
    }
  }

  const lines = buildLineBoxes(result);
  if (!lines.length) return [];

  const widthFromResult = Number(result?.data?.width);
  const heightFromResult = Number(result?.data?.height);
  const pageWidth = Number.isFinite(widthFromResult)
    ? Math.max(1, widthFromResult)
    : Math.max(...lines.map((line) => line.right));
  const pageHeight = Number.isFinite(heightFromResult)
    ? Math.max(1, heightFromResult)
    : Math.max(...lines.map((line) => line.bottom));

  const blocks = groupLinesToBlocks(lines);
  return blocksToHotspots(blocks, pageWidth, pageHeight);
}
