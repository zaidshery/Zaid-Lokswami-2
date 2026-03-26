import 'server-only';

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getGeminiTtsRuntimeConfig, synthesizeGeminiSpeech } from '@/lib/ai/geminiTts';
import {
  buildSpokenBreakingHeadline,
  detectBreakingTtsLanguage,
  normalizeBreakingTtsMetadata,
  type BreakingNewsItem,
  type BreakingTtsMetadata,
} from '@/lib/types/breaking';

type BreakingAudioPublicPathPrefix =
  | '/uploads/breaking-audio'
  | '/api/public/uploads/breaking-audio';

type BreakingAudioStorageConfig = {
  mode: 'public' | 'proxy';
  fsBaseDir: string;
  publicPathPrefix: BreakingAudioPublicPathPrefix;
};

type BreakingArticleLike = {
  id: string;
  title: string;
  city?: string;
  isBreaking: boolean;
  breakingTts: BreakingTtsMetadata | null;
};

const DEFAULT_STORAGE_UPLOADS_BASE_DIR = path.resolve(process.cwd(), 'storage', 'uploads');
const STORAGE_UPLOADS_BASE_DIR = (() => {
  const configured = String(process.env.EPAPER_STORAGE_UPLOADS_BASE_DIR || '').trim();
  if (!configured) return DEFAULT_STORAGE_UPLOADS_BASE_DIR;
  return path.isAbsolute(configured)
    ? path.resolve(configured)
    : path.resolve(process.cwd(), configured);
})();
const PUBLIC_BREAKING_AUDIO_BASE_DIR = path.resolve(
  process.cwd(),
  'public',
  'uploads',
  'breaking-audio'
);
const STORAGE_BREAKING_AUDIO_BASE_DIR = path.resolve(
  STORAGE_UPLOADS_BASE_DIR,
  'breaking-audio'
);
const SAFE_SEGMENT_PATTERN = /^[a-zA-Z0-9._-]+$/;
const BREAKING_AUDIO_EXTENSION = '.wav';

let storageConfigPromise: Promise<BreakingAudioStorageConfig> | null = null;

function sanitizePathSegment(segment: string) {
  const cleaned = segment.trim();
  if (!cleaned || cleaned === '.' || cleaned === '..' || !SAFE_SEGMENT_PATTERN.test(cleaned)) {
    return '';
  }
  return cleaned;
}

function safeArticleSegment(articleId: string) {
  const normalized = articleId.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitizePathSegment(normalized) || crypto.createHash('sha1').update(articleId).digest('hex');
}

function buildBreakingAudioPath(
  prefix: BreakingAudioPublicPathPrefix,
  articleId: string,
  fileName: string
) {
  return `${prefix}/${articleId}/${fileName}`.replace(/\\/g, '/');
}

function isInsideBaseDir(baseDir: string, absolutePath: string) {
  const relative = path.relative(baseDir, absolutePath);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function canWriteToBaseDir(baseDir: string) {
  try {
    await fs.mkdir(baseDir, { recursive: true });
    const probeDir = path.resolve(baseDir, '.breaking-audio-probe');
    const probeFile = path.join(probeDir, `.probe-${Date.now()}.txt`);
    await fs.mkdir(probeDir, { recursive: true });
    await fs.writeFile(probeFile, 'ok', 'utf-8');
    await fs.unlink(probeFile).catch(() => undefined);
    await fs.rm(probeDir, { recursive: true, force: true }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

async function getBreakingAudioStorageConfig(): Promise<BreakingAudioStorageConfig> {
  if (!storageConfigPromise) {
    storageConfigPromise = (async () => {
      if (await canWriteToBaseDir(PUBLIC_BREAKING_AUDIO_BASE_DIR)) {
        return {
          mode: 'public',
          fsBaseDir: PUBLIC_BREAKING_AUDIO_BASE_DIR,
          publicPathPrefix: '/uploads/breaking-audio',
        };
      }

      if (await canWriteToBaseDir(STORAGE_BREAKING_AUDIO_BASE_DIR)) {
        return {
          mode: 'proxy',
          fsBaseDir: STORAGE_BREAKING_AUDIO_BASE_DIR,
          publicPathPrefix: '/api/public/uploads/breaking-audio',
        };
      }

      throw new Error(
        'No writable breaking-audio storage directory available. Set EPAPER_STORAGE_UPLOADS_BASE_DIR to a writable path.'
      );
    })();
  }

  return storageConfigPromise;
}

function normalizeBreakingArticle(source: unknown): BreakingArticleLike | null {
  if (!source || typeof source !== 'object') return null;
  const item = source as Record<string, unknown>;

  const id = String(item._id || item.id || '').trim();
  const title = String(item.title || '').trim();
  if (!id || !title) return null;

  return {
    id,
    title,
    city: typeof item.city === 'string' ? item.city.trim() || undefined : undefined,
    isBreaking: Boolean(item.isBreaking),
    breakingTts: normalizeBreakingTtsMetadata(item.breakingTts),
  };
}

function buildBreakingTtsExpectation(article: Pick<BreakingArticleLike, 'title' | 'city'>) {
  const spokenText = buildSpokenBreakingHeadline({
    id: 'breaking',
    title: article.title,
    ...(article.city ? { city: article.city } : {}),
  } satisfies BreakingNewsItem);
  const runtimeConfig = getGeminiTtsRuntimeConfig();
  const languageCode = detectBreakingTtsLanguage(spokenText, 'hi');
  const voice = runtimeConfig.defaultVoice;
  const model = runtimeConfig.model;
  const textHash = crypto
    .createHash('sha1')
    .update(
      JSON.stringify({
        text: spokenText,
        languageCode,
        voice,
        model,
      })
    )
    .digest('hex');

  return {
    spokenText,
    languageCode,
    voice,
    model,
    textHash,
    mimeType: 'audio/wav',
  };
}

async function writeBreakingAudioBuffer(params: {
  articleId: string;
  textHash: string;
  buffer: Buffer;
}) {
  const storage = await getBreakingAudioStorageConfig();
  const safeArticleId = safeArticleSegment(params.articleId);
  const fileName = `${params.textHash}${BREAKING_AUDIO_EXTENSION}`;
  const targetDir = path.resolve(storage.fsBaseDir, safeArticleId);

  if (!isInsideBaseDir(storage.fsBaseDir, targetDir)) {
    throw new Error('Invalid breaking audio storage directory');
  }

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, fileName), params.buffer);

  return {
    audioUrl: buildBreakingAudioPath(storage.publicPathPrefix, safeArticleId, fileName),
  };
}

export async function deleteStoredBreakingAudio(assetPath: string) {
  const trimmed = assetPath.trim();
  if (!trimmed) return;

  const relativePublic = trimmed.startsWith('/uploads/breaking-audio/')
    ? trimmed.slice('/uploads/breaking-audio/'.length)
    : '';
  const relativeProxy = trimmed.startsWith('/api/public/uploads/breaking-audio/')
    ? trimmed.slice('/api/public/uploads/breaking-audio/'.length)
    : '';
  const relativePath = (relativePublic || relativeProxy).replace(/\\/g, '/').replace(/^\/+/, '');
  if (!relativePath) return;

  const parts = relativePath.split('/').filter(Boolean);
  if (!parts.length || parts.some((part) => !sanitizePathSegment(part))) {
    return;
  }

  const candidates = [
    path.resolve(PUBLIC_BREAKING_AUDIO_BASE_DIR, ...parts),
    path.resolve(STORAGE_BREAKING_AUDIO_BASE_DIR, ...parts),
  ];

  await Promise.all(
    candidates.map(async (candidate) => {
      const inPublic = isInsideBaseDir(PUBLIC_BREAKING_AUDIO_BASE_DIR, candidate);
      const inStorage = isInsideBaseDir(STORAGE_BREAKING_AUDIO_BASE_DIR, candidate);
      if (!inPublic && !inStorage) return;
      await fs.unlink(candidate).catch(() => undefined);
    })
  );
}

export function resolveReusableBreakingTts(article: unknown): BreakingTtsMetadata | null {
  const normalized = normalizeBreakingArticle(article);
  if (!normalized?.breakingTts) return null;

  const expected = buildBreakingTtsExpectation(normalized);
  const metadata = normalized.breakingTts;

  if (
    metadata.textHash !== expected.textHash ||
    metadata.languageCode !== expected.languageCode ||
    metadata.voice !== expected.voice ||
    metadata.model !== expected.model ||
    !metadata.audioUrl
  ) {
    return null;
  }

  return metadata;
}

export async function ensureBreakingTtsForArticle(
  article: unknown,
  options?: { forceRegenerate?: boolean }
) {
  const normalized = normalizeBreakingArticle(article);
  if (!normalized || !normalized.isBreaking) {
    return null;
  }

  const reusable = resolveReusableBreakingTts(normalized);
  if (reusable && !options?.forceRegenerate) {
    return reusable;
  }

  const expected = buildBreakingTtsExpectation(normalized);
  if (!expected.spokenText) {
    return null;
  }

  const result = await synthesizeGeminiSpeech({
    text: expected.spokenText,
    languageCode: expected.languageCode,
    voice: expected.voice,
  });

  if (result.mode !== 'gemini') {
    return null;
  }

  const audioBuffer = Buffer.from(result.audioBase64, 'base64');
  if (!audioBuffer.length) {
    return null;
  }

  const saved = await writeBreakingAudioBuffer({
    articleId: normalized.id,
    textHash: expected.textHash,
    buffer: audioBuffer,
  });

  if (
    normalized.breakingTts?.audioUrl &&
    normalized.breakingTts.audioUrl !== saved.audioUrl
  ) {
    await deleteStoredBreakingAudio(normalized.breakingTts.audioUrl).catch(() => undefined);
  }

  return {
    audioUrl: saved.audioUrl,
    textHash: expected.textHash,
    languageCode: expected.languageCode,
    voice: result.voice,
    model: result.model,
    mimeType: result.mimeType,
    generatedAt: new Date().toISOString(),
  } satisfies BreakingTtsMetadata;
}
