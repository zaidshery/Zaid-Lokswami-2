import { COMPANY_INFO } from '@/lib/constants/company';

type BuildArticleWhatsAppShareInput = {
  title: string;
  articleUrl: string;
  imageUrl?: string;
};

function cleanUrl(value: string) {
  return value.trim();
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function isLocalOrigin(value: string) {
  try {
    const url = new URL(value);
    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1'
    );
  } catch {
    return true;
  }
}

function getPreferredOrigin(origin: string) {
  const runtimeOrigin = trimTrailingSlash(cleanUrl(origin));
  const configured = trimTrailingSlash(cleanUrl(process.env.NEXT_PUBLIC_SITE_URL || ''));

  if (configured && !isLocalOrigin(configured)) return configured;
  return runtimeOrigin;
}

function socialHandle(url: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    if (!last) return parsed.hostname;
    return last.startsWith('@') ? last : `@${last}`;
  } catch {
    return url;
  }
}

export function toAbsoluteShareUrl(value: string, origin: string) {
  const trimmed = cleanUrl(value);
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const baseOrigin = getPreferredOrigin(origin);
  return `${baseOrigin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export function buildArticleWhatsAppShareText({
  title,
  articleUrl,
  imageUrl,
}: BuildArticleWhatsAppShareInput) {
  const lines: string[] = [
    title.trim(),
  ];

  // Keep article/image URL first so WhatsApp preview prefers article context.
  const cleanImage = imageUrl ? cleanUrl(imageUrl) : '';
  if (cleanImage) lines.push(cleanImage);

  const cleanArticleUrl = cleanUrl(articleUrl);
  lines.push(cleanArticleUrl);
  lines.push('');
  lines.push('Follow Lokswami:');
  const localShareContext =
    isLocalOrigin(cleanArticleUrl) || (cleanImage ? isLocalOrigin(cleanImage) : false);

  if (localShareContext) {
    // Keep handles + full URL visible in local share context.
    lines.push(`Facebook: ${socialHandle(COMPANY_INFO.social.facebook)} | ${COMPANY_INFO.social.facebook}`);
    lines.push(`Instagram: ${socialHandle(COMPANY_INFO.social.instagram)} | ${COMPANY_INFO.social.instagram}`);
    lines.push(`YouTube: ${socialHandle(COMPANY_INFO.social.youtube)} | ${COMPANY_INFO.social.youtube}`);
    lines.push(`X: ${socialHandle(COMPANY_INFO.social.twitter)} | ${COMPANY_INFO.social.twitter}`);
    lines.push(`WhatsApp Channel: ${socialHandle(COMPANY_INFO.social.whatsapp)} | ${COMPANY_INFO.social.whatsapp}`);
  } else {
    lines.push(`Facebook: ${COMPANY_INFO.social.facebook}`);
    lines.push(`Instagram: ${COMPANY_INFO.social.instagram}`);
    lines.push(`YouTube: ${COMPANY_INFO.social.youtube}`);
    lines.push(`X: ${COMPANY_INFO.social.twitter}`);
    lines.push(`WhatsApp Channel: ${COMPANY_INFO.social.whatsapp}`);
  }

  return lines.join('\n');
}

export function buildArticleWhatsAppShareUrl(input: BuildArticleWhatsAppShareInput) {
  const text = buildArticleWhatsAppShareText(input);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
