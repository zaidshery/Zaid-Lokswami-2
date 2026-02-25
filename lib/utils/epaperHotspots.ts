export interface EPaperArticleHotspot {
  id: string;
  title: string;
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_HOTSPOTS = 60;

interface HotspotOptions {
  maxHotspots?: number;
  maxPages?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toFiniteNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function resolveMaxPages(maxPages?: number) {
  if (typeof maxPages !== 'number' || !Number.isFinite(maxPages) || maxPages < 1) {
    return null;
  }
  return Math.floor(maxPages);
}

function normalizeSingleHotspot(
  value: unknown,
  index: number,
  maxPages?: number
): EPaperArticleHotspot | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;

  const idRaw = typeof source.id === 'string' ? source.id.trim() : '';
  const title = typeof source.title === 'string' ? source.title.trim() : '';
  const text = typeof source.text === 'string' ? source.text.trim() : '';
  const pageLimit = resolveMaxPages(maxPages);
  const page = Math.round(
    clamp(toFiniteNumber(source.page, 1), 1, pageLimit ?? Number.MAX_SAFE_INTEGER)
  );

  const x = clamp(toFiniteNumber(source.x, 0), 0, 100);
  const y = clamp(toFiniteNumber(source.y, 0), 0, 100);
  let width = clamp(toFiniteNumber(source.width, 0), 0.1, 100);
  let height = clamp(toFiniteNumber(source.height, 0), 0.1, 100);

  if (x + width > 100) {
    width = Math.max(0.1, 100 - x);
  }
  if (y + height > 100) {
    height = Math.max(0.1, 100 - y);
  }

  if (width <= 0 || height <= 0) return null;

  return {
    id: idRaw || `hs-${index + 1}`,
    title,
    text,
    page,
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    width: Number(width.toFixed(3)),
    height: Number(height.toFixed(3)),
  };
}

export function normalizeArticleHotspots(
  raw: unknown,
  options: HotspotOptions = {}
): EPaperArticleHotspot[] {
  if (!Array.isArray(raw)) return [];

  const maxHotspots =
    typeof options.maxHotspots === 'number' &&
    Number.isFinite(options.maxHotspots) &&
    options.maxHotspots > 0
      ? Math.floor(options.maxHotspots)
      : MAX_HOTSPOTS;
  const maxPages = resolveMaxPages(options.maxPages);
  const normalized: EPaperArticleHotspot[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    if (normalized.length >= maxHotspots) break;
    const hotspot = normalizeSingleHotspot(raw[index], index, maxPages ?? undefined);
    if (hotspot) normalized.push(hotspot);
  }
  return normalized;
}

export function validateArticleHotspots(
  hotspots: EPaperArticleHotspot[],
  options: HotspotOptions = {}
): string | null {
  const maxHotspots =
    typeof options.maxHotspots === 'number' &&
    Number.isFinite(options.maxHotspots) &&
    options.maxHotspots > 0
      ? Math.floor(options.maxHotspots)
      : MAX_HOTSPOTS;
  const maxPages = resolveMaxPages(options.maxPages);

  if (hotspots.length > maxHotspots) {
    return `You can add up to ${maxHotspots} article hotspots per e-paper.`;
  }

  for (let index = 0; index < hotspots.length; index += 1) {
    const hotspot = hotspots[index];
    const label = `Hotspot ${index + 1}`;

    if (hotspot.title && hotspot.title.length > 180) {
      return `${label}: title is too long (max 180 characters)`;
    }
    if (hotspot.text && hotspot.text.length > 4000) {
      return `${label}: text is too long (max 4000 characters)`;
    }

    const values = [hotspot.page, hotspot.x, hotspot.y, hotspot.width, hotspot.height];
    if (!values.every((value) => Number.isFinite(value))) {
      return `${label}: coordinates must be valid numbers`;
    }

    if (!Number.isInteger(hotspot.page) || hotspot.page < 1) {
      return `${label}: page must be a positive integer`;
    }
    if (maxPages !== null && hotspot.page > maxPages) {
      return `${label}: page must be between 1 and ${maxPages}`;
    }

    if (hotspot.x < 0 || hotspot.x > 100) return `${label}: x must be between 0 and 100`;
    if (hotspot.y < 0 || hotspot.y > 100) return `${label}: y must be between 0 and 100`;
    if (hotspot.width <= 0 || hotspot.width > 100) return `${label}: width must be between 0 and 100`;
    if (hotspot.height <= 0 || hotspot.height > 100) return `${label}: height must be between 0 and 100`;
    if (hotspot.x + hotspot.width > 100.001) return `${label}: x + width must be <= 100`;
    if (hotspot.y + hotspot.height > 100.001) return `${label}: y + height must be <= 100`;
  }

  return null;
}
