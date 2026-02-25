import crypto from 'crypto';

function twoDigit(value: number) {
  return `${value}`.padStart(2, '0');
}

function randomChunk(length: number) {
  const raw =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : crypto.randomBytes(16).toString('hex');
  return raw.slice(0, length).toUpperCase();
}

export function generateContactTicketId(now = new Date()) {
  const datePart = `${now.getUTCFullYear()}${twoDigit(now.getUTCMonth() + 1)}${twoDigit(
    now.getUTCDate()
  )}`;
  return `LK-CON-${datePart}-${randomChunk(6)}`;
}
