import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const DATA_URI_PATTERN = /^data:([^;]+);base64,([a-z0-9+/=\s]+)$/i;

function toUploadExtension(mimeType: string) {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === 'image/jpeg' || normalized === 'image/jpg') return 'jpg';
  if (normalized === 'image/png') return 'png';
  if (normalized === 'application/pdf') return 'pdf';
  return '';
}

function parseDataUri(value: string) {
  const match = DATA_URI_PATTERN.exec(value.trim());
  if (!match) {
    throw new Error('Invalid data URL format');
  }

  const mimeType = match[1].trim().toLowerCase();
  const extension = toUploadExtension(mimeType);
  if (!extension) {
    throw new Error('Unsupported data URL file type');
  }

  const base64 = match[2].replace(/\s/g, '');
  let buffer: Buffer;

  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    throw new Error('Invalid base64 data in data URL');
  }

  if (!buffer.length) {
    throw new Error('Uploaded data URL is empty');
  }

  return { extension, buffer };
}

async function writeDataUriFile(value: string, kind: 'thumbnails' | 'papers') {
  const parsed = parseDataUri(value);
  const folder = path.join(process.cwd(), 'public', 'uploads', 'epapers', kind);
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${parsed.extension}`;
  const filePath = path.join(folder, fileName);

  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(filePath, parsed.buffer);

  return `/uploads/epapers/${kind}/${fileName}`;
}

export async function persistInlineEpaperAssets(input: {
  thumbnail: string;
  pdfUrl: string;
}) {
  let thumbnail = input.thumbnail.trim();
  let pdfUrl = input.pdfUrl.trim();

  if (thumbnail.toLowerCase().startsWith('data:')) {
    thumbnail = await writeDataUriFile(thumbnail, 'thumbnails');
  }

  if (pdfUrl.toLowerCase().startsWith('data:')) {
    pdfUrl = await writeDataUriFile(pdfUrl, 'papers');
  }

  return { thumbnail, pdfUrl };
}

export function normalizePublishDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const dashMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    return `${year}-${month}-${day}`;
  }

  const slashMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return trimmed;
}
