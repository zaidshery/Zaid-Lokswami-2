export default function formatNumber(value: number | string | undefined, locale = 'en-US') {
  if (value == null) return '0';
  const num = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '') || 0);
  try {
    return new Intl.NumberFormat(locale).format(num);
  } catch {
    // Fallback: plain number with no grouping
    return String(num);
  }
}
