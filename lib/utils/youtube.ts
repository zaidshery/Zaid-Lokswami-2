const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

function normalizeHost(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function extractFromPath(pathname: string, prefix: string) {
  if (!pathname.startsWith(prefix)) return null;
  const value = pathname.slice(prefix.length).split('/')[0] || '';
  return value.trim();
}

export function extractYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  if (YOUTUBE_ID_PATTERN.test(value)) {
    return value;
  }

  let url: URL;
  try {
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    url = new URL(normalized);
  } catch {
    return null;
  }

  const host = normalizeHost(url.hostname);
  let candidate = '';

  if (host === 'youtu.be') {
    candidate = url.pathname.split('/').filter(Boolean)[0] || '';
  } else if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    if (url.pathname === '/watch') {
      candidate = url.searchParams.get('v') || '';
    } else {
      candidate =
        extractFromPath(url.pathname, '/shorts/') ||
        extractFromPath(url.pathname, '/embed/') ||
        extractFromPath(url.pathname, '/live/') ||
        extractFromPath(url.pathname, '/v/') ||
        '';
    }
  }

  candidate = candidate.trim();
  return YOUTUBE_ID_PATTERN.test(candidate) ? candidate : null;
}

export function buildYouTubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function buildYouTubeEmbedUrl(videoId: string) {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    autoplay: '0',
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
