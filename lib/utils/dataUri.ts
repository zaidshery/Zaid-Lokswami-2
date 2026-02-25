export function getDataUriApproxBytes(value: string): number | null {
  const trimmed = value.trim();
  const match = /^data:[^;]+;base64,([a-z0-9+/=\s]+)$/i.exec(trimmed);
  if (!match) return null;

  const base64 = match[1].replace(/\s/g, '');
  if (!base64) return 0;

  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function getErrorMessage(error: unknown) {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') return maybeMessage;
  }
  return '';
}

export function isLikelyBsonSizeError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  if (!message) return false;

  return (
    message.includes('bson') &&
    (message.includes('size') ||
      message.includes('too large') ||
      message.includes('larger than') ||
      message.includes('document'))
  );
}
