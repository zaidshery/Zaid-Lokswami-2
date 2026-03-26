export type BreakingNewsItem = {
  id: string;
  title: string;
  city?: string;
  category?: string;
  createdAt?: string;
  href?: string;
  priority?: number;
  ttsAudioUrl?: string;
  ttsReady?: boolean;
};

export type BreakingTtsMetadata = {
  audioUrl: string;
  textHash: string;
  languageCode: 'hi-IN' | 'en-IN';
  voice: string;
  model: string;
  mimeType: string;
  generatedAt: string;
};

export function normalizeBreakingTtsMetadata(source: unknown): BreakingTtsMetadata | null {
  if (!source || typeof source !== 'object') return null;
  const item = source as Record<string, unknown>;

  const audioUrl = typeof item.audioUrl === 'string' ? item.audioUrl.trim() : '';
  const textHash = typeof item.textHash === 'string' ? item.textHash.trim() : '';
  const languageCode =
    item.languageCode === 'en-IN' ? 'en-IN' : item.languageCode === 'hi-IN' ? 'hi-IN' : '';
  const voice = typeof item.voice === 'string' ? item.voice.trim() : '';
  const model = typeof item.model === 'string' ? item.model.trim() : '';
  const mimeType = typeof item.mimeType === 'string' ? item.mimeType.trim() : '';
  const generatedAtValue =
    typeof item.generatedAt === 'string' ||
    typeof item.generatedAt === 'number' ||
    item.generatedAt instanceof Date
      ? new Date(item.generatedAt)
      : null;

  if (!audioUrl || !textHash || !languageCode || !voice || !model || !mimeType) {
    return null;
  }

  return {
    audioUrl,
    textHash,
    languageCode,
    voice,
    model,
    mimeType,
    generatedAt:
      generatedAtValue && !Number.isNaN(generatedAtValue.getTime())
        ? generatedAtValue.toISOString()
        : new Date(0).toISOString(),
  };
}

export function normalizeBreakingNewsItem(source: unknown): BreakingNewsItem | null {
  if (!source || typeof source !== 'object') return null;
  const item = source as Record<string, unknown>;

  const id = String(item.id ?? item._id ?? '').trim();
  const title = String(item.title ?? '').trim();
  if (!id || !title) return null;

  const city = typeof item.city === 'string' ? item.city.trim() : '';
  const category = typeof item.category === 'string' ? item.category.trim() : '';
  const createdAt = typeof item.createdAt === 'string' ? item.createdAt.trim() : '';
  const href = typeof item.href === 'string' ? item.href.trim() : '';
  const priorityRaw = Number(item.priority);
  const ttsAudioUrl = typeof item.ttsAudioUrl === 'string' ? item.ttsAudioUrl.trim() : '';
  const ttsReady =
    typeof item.ttsReady === 'boolean'
      ? item.ttsReady
      : typeof item.breakingTts === 'object' && item.breakingTts
        ? Boolean(normalizeBreakingTtsMetadata(item.breakingTts))
        : false;

  return {
    id,
    title,
    city: city || undefined,
    category: category || undefined,
    createdAt: createdAt || undefined,
    href: href || undefined,
    priority: Number.isFinite(priorityRaw) ? priorityRaw : undefined,
    ttsAudioUrl: ttsAudioUrl || undefined,
    ttsReady: ttsReady || undefined,
  };
}

export function sortBreakingNewsItems(items: BreakingNewsItem[]) {
  return [...items].sort((a, b) => {
    const ap = Number.isFinite(a.priority) ? Number(a.priority) : 0;
    const bp = Number.isFinite(b.priority) ? Number(b.priority) : 0;
    if (bp !== ap) return bp - ap;

    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });
}

export function buildSpokenBreakingHeadline(item: BreakingNewsItem) {
  const cityPrefix = item.city ? `${item.city}: ` : '';
  return `${cityPrefix}${item.title}`.trim();
}

export function detectBreakingTtsLanguage(
  text: string,
  preferredLanguage: 'hi' | 'en' = 'hi'
): 'hi-IN' | 'en-IN' {
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  const latinCount = (text.match(/[A-Za-z]/g) || []).length;

  if (devanagariCount > 0 && devanagariCount >= Math.max(1, Math.floor(latinCount / 2))) {
    return 'hi-IN';
  }

  if (latinCount > devanagariCount) {
    return 'en-IN';
  }

  return preferredLanguage === 'hi' ? 'hi-IN' : 'en-IN';
}

function getBreakingComparisonKey(item: BreakingNewsItem) {
  return [
    item.id,
    item.title,
    item.city || '',
    item.category || '',
    item.createdAt || '',
    item.href || '',
    Number.isFinite(item.priority) ? Number(item.priority) : 0,
    item.ttsAudioUrl || '',
    item.ttsReady ? '1' : '0',
  ].join('||');
}

export function breakingQueuesEqualByOrder(a: BreakingNewsItem[], b: BreakingNewsItem[]) {
  if (a.length !== b.length) return false;

  return a.every((item, index) => {
    const other = b[index];
    if (!other) return false;
    return getBreakingComparisonKey(item) === getBreakingComparisonKey(other);
  });
}
