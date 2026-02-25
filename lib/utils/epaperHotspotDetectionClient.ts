'use client';

import {
  normalizeArticleHotspots,
  type EPaperArticleHotspot,
} from '@/lib/utils/epaperHotspots';
import { generateArticleHotspotsLocally } from '@/lib/utils/epaperLocalOcrClient';

export type HotspotDetectionEngine = 'api' | 'local';

interface DetectHotspotsInput {
  thumbnail: string;
  authHeaders?: Record<string, string>;
  maxPages: number;
  localLanguage?: string;
}

interface DetectHotspotsResult {
  hotspots: EPaperArticleHotspot[];
  engine: HotspotDetectionEngine;
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Failed to detect hotspots';
}

function isLocalOnlyModeEnabled() {
  const value = (process.env.NEXT_PUBLIC_EPAPER_LOCAL_OCR_ONLY || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

function isRemoteFallbackEnabled() {
  const value = (process.env.NEXT_PUBLIC_EPAPER_REMOTE_OCR_FALLBACK || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

export async function detectHotspotsFromImageClient(
  input: DetectHotspotsInput
): Promise<DetectHotspotsResult> {
  const thumbnail = input.thumbnail.trim();
  if (!thumbnail) throw new Error('Thumbnail is required');

  if (isLocalOnlyModeEnabled()) {
    const localHotspots = await generateArticleHotspotsLocally(thumbnail, {
      language: input.localLanguage || 'hin+eng',
    });
    return {
      hotspots: normalizeArticleHotspots(localHotspots, {
        maxPages: input.maxPages,
      }),
      engine: 'local',
    };
  }

  let localErrorMessage = '';
  try {
    const localHotspots = await generateArticleHotspotsLocally(thumbnail, {
      language: input.localLanguage || 'hin+eng',
    });
    return {
      hotspots: normalizeArticleHotspots(localHotspots, {
        maxPages: input.maxPages,
      }),
      engine: 'local',
    };
  } catch (error) {
    localErrorMessage = toErrorMessage(error);
  }

  if (!isRemoteFallbackEnabled()) {
    throw new Error(
      `Local OCR failed: ${localErrorMessage}. Enable NEXT_PUBLIC_EPAPER_REMOTE_OCR_FALLBACK=true to allow server OCR fallback.`
    );
  }

  let apiErrorMessage = '';
  try {
    const response = await fetch('/api/admin/epapers/assist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(input.authHeaders || {}),
      },
      body: JSON.stringify({ thumbnail }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || 'Failed to auto-detect hotspots');
    }

    return {
      hotspots: normalizeArticleHotspots(data?.data?.hotspots, {
        maxPages: input.maxPages,
      }),
      engine: 'api',
    };
  } catch (error) {
    apiErrorMessage = toErrorMessage(error);
  }

  throw new Error(`Local OCR failed: ${localErrorMessage}. API OCR failed: ${apiErrorMessage}`);
}
