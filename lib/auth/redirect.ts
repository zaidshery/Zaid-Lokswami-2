export function normalizeRedirectPath(
  value: string | null | undefined,
  fallback = '/admin'
) {
  const next = (value || '').trim();
  if (!next) return fallback;

  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('//')) return fallback;
  if (next.startsWith('/\\')) return fallback;
  if (next.includes('\\')) return fallback;
  if (next.startsWith('/api/')) return fallback;

  return next;
}
