import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { type TtsStorageMode } from '@/lib/types/tts';

export type TtsPublicPathPrefix = '/uploads/tts' | '/api/public/uploads/tts';

type TtsStorageConfig = {
  mode: TtsStorageMode;
  fsBaseDir: string;
  publicPathPrefix: TtsPublicPathPrefix;
};

type ResolvedTtsAssetPath = {
  mode: TtsStorageMode;
  relativePath: string;
  absolutePath: string;
  publicPathPrefix: TtsPublicPathPrefix;
  fsBaseDir: string;
};

const PUBLIC_TTS_BASE_DIR = path.resolve(process.cwd(), 'public', 'uploads', 'tts');
const DEFAULT_STORAGE_UPLOADS_BASE_DIR = path.resolve(process.cwd(), 'storage', 'uploads');
const STORAGE_UPLOADS_BASE_DIR = (() => {
  const configured = String(process.env.EPAPER_STORAGE_UPLOADS_BASE_DIR || '').trim();
  if (!configured) return DEFAULT_STORAGE_UPLOADS_BASE_DIR;
  return path.isAbsolute(configured)
    ? path.resolve(configured)
    : path.resolve(process.cwd(), configured);
})();
const STORAGE_TTS_BASE_DIR = path.resolve(STORAGE_UPLOADS_BASE_DIR, 'tts');
const SAFE_SEGMENT_PATTERN = /^[a-zA-Z0-9._-]+$/;
const SAFE_FILE_NAME_PATTERN = /^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]+$/;

let storageConfigPromise: Promise<TtsStorageConfig> | null = null;

function sanitizePathSegment(segment: string) {
  const cleaned = segment.trim();
  if (!cleaned || cleaned === '.' || cleaned === '..' || !SAFE_SEGMENT_PATTERN.test(cleaned)) {
    return '';
  }
  return cleaned;
}

function normalizeTargetDirectory(input: string) {
  const normalized = input.replace(/\\/g, '/').trim().replace(/^\/+|\/+$/g, '');
  if (!normalized) return '';

  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return '';

  const safeParts = parts.map(sanitizePathSegment);
  if (safeParts.some((part) => !part)) {
    throw new Error('Invalid TTS target directory');
  }

  return safeParts.join('/');
}

function normalizeTargetName(input: string) {
  const fileName = input.trim();
  if (!fileName || fileName.includes('/') || fileName.includes('\\')) {
    throw new Error('Invalid TTS target filename');
  }
  if (!SAFE_FILE_NAME_PATTERN.test(fileName)) {
    throw new Error('Invalid TTS target filename');
  }

  return fileName;
}

function isInsideBaseDir(baseDir: string, absolutePath: string) {
  const relative = path.relative(baseDir, absolutePath);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function canWriteToBaseDir(baseDir: string) {
  try {
    await fs.mkdir(baseDir, { recursive: true });
    const probeDir = path.resolve(baseDir, '.tts-probe');
    const probeFile = path.join(probeDir, `.probe-${Date.now()}.txt`);
    await fs.mkdir(probeDir, { recursive: true });
    await fs.writeFile(probeFile, 'ok', 'utf8');
    await fs.unlink(probeFile).catch(() => undefined);
    await fs.rm(probeDir, { recursive: true, force: true }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

async function canWriteToPublicUploads() {
  if (process.env.EPAPER_FORCE_STORAGE === '1') return false;

  try {
    return await canWriteToBaseDir(PUBLIC_TTS_BASE_DIR);
  } catch {
    return false;
  }
}

export async function getTtsStorageConfig(): Promise<TtsStorageConfig> {
  if (!storageConfigPromise) {
    storageConfigPromise = (async () => {
      if (await canWriteToPublicUploads()) {
        return {
          mode: 'public',
          fsBaseDir: PUBLIC_TTS_BASE_DIR,
          publicPathPrefix: '/uploads/tts',
        };
      }

      if (await canWriteToBaseDir(STORAGE_TTS_BASE_DIR)) {
        return {
          mode: 'proxy',
          fsBaseDir: STORAGE_TTS_BASE_DIR,
          publicPathPrefix: '/api/public/uploads/tts',
        };
      }

      throw new Error(
        'No writable shared TTS storage directory available. Set EPAPER_STORAGE_UPLOADS_BASE_DIR to a writable path.'
      );
    })();
  }

  return storageConfigPromise;
}

export function buildTtsAssetPath(
  publicPathPrefix: TtsPublicPathPrefix,
  relativePath: string
) {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${publicPathPrefix}/${normalized}`.replace(/\\/g, '/');
}

export async function saveTtsAudioBuffer(params: {
  buffer: Buffer;
  targetDir: string;
  targetName: string;
}) {
  const storage = await getTtsStorageConfig();
  const safeDir = normalizeTargetDirectory(params.targetDir);
  const safeName = normalizeTargetName(params.targetName);
  const relativePath = safeDir ? `${safeDir}/${safeName}` : safeName;
  const absolutePath = path.resolve(storage.fsBaseDir, ...relativePath.split('/'));

  if (!isInsideBaseDir(storage.fsBaseDir, absolutePath)) {
    throw new Error('Invalid shared TTS storage path');
  }

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, params.buffer);

  return {
    audioUrl: buildTtsAssetPath(storage.publicPathPrefix, relativePath),
    storageMode: storage.mode,
    absolutePath,
    relativePath,
  };
}

function isSafeRelativeAssetPath(relativePath: string) {
  if (!relativePath) return false;

  const normalized = relativePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return false;

  return parts.every((part, index) =>
    index === parts.length - 1
      ? SAFE_FILE_NAME_PATTERN.test(part)
      : Boolean(sanitizePathSegment(part))
  );
}

export function resolveTtsAssetPath(assetPath: string): ResolvedTtsAssetPath | null {
  const value = assetPath.trim();
  if (!value) return null;

  let mode: TtsStorageMode | null = null;
  let relativePath = '';
  let publicPathPrefix: TtsPublicPathPrefix | null = null;
  let fsBaseDir = '';

  if (value.startsWith('/uploads/tts/')) {
    mode = 'public';
    publicPathPrefix = '/uploads/tts';
    fsBaseDir = PUBLIC_TTS_BASE_DIR;
    relativePath = value.slice('/uploads/tts/'.length);
  } else if (value.startsWith('/api/public/uploads/tts/')) {
    mode = 'proxy';
    publicPathPrefix = '/api/public/uploads/tts';
    fsBaseDir = STORAGE_TTS_BASE_DIR;
    relativePath = value.slice('/api/public/uploads/tts/'.length);
  } else {
    return null;
  }

  if (!isSafeRelativeAssetPath(relativePath)) return null;
  const absolutePath = path.resolve(fsBaseDir, ...relativePath.split('/'));
  if (!isInsideBaseDir(fsBaseDir, absolutePath)) return null;

  return {
    mode,
    relativePath: relativePath.replace(/\\/g, '/'),
    absolutePath,
    publicPathPrefix,
    fsBaseDir,
  };
}

export function hasStoredTtsAsset(assetPath: string) {
  const resolved = resolveTtsAssetPath(assetPath);
  return resolved ? fsSync.existsSync(resolved.absolutePath) : false;
}

export async function deleteStoredTtsAsset(assetPath: string) {
  const resolved = resolveTtsAssetPath(assetPath);
  if (!resolved) return;

  await fs.unlink(resolved.absolutePath).catch(() => undefined);
}
