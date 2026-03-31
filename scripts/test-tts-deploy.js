const DEFAULT_TIMEOUT_MS = 45000;
const AUDIO_CONTENT_TYPE_PATTERN = /\b(?:audio\/[a-z0-9.+-]+|application\/octet-stream)\b/i;

function parseArgs(argv) {
  let baseUrl = '';
  let timeoutMs = DEFAULT_TIMEOUT_MS;

  for (const arg of argv) {
    if (!arg) continue;

    if (arg === '--help' || arg === '-h') {
      return { help: true, baseUrl: '', timeoutMs };
    }

    if (arg.startsWith('--baseUrl=')) {
      baseUrl = arg.slice('--baseUrl='.length).trim();
      continue;
    }

    if (arg.startsWith('--timeoutMs=')) {
      const parsed = Number.parseInt(arg.slice('--timeoutMs='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        timeoutMs = parsed;
      }
      continue;
    }

    if (!arg.startsWith('--') && !baseUrl) {
      baseUrl = arg.trim();
    }
  }

  return { help: false, baseUrl, timeoutMs };
}

function normalizeBaseUrl(raw) {
  const fallback =
    process.env.SMOKE_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000';

  const candidate = (raw || fallback).trim();
  if (!candidate) {
    throw new Error('Missing base URL. Pass one as an argument or set NEXT_PUBLIC_SITE_URL.');
  }

  const parsed = new URL(candidate);
  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/+$/, '');
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readText(response) {
  return response.text();
}

async function readJson(response) {
  const text = await readText(response);
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON response but received: ${text.slice(0, 200)}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function logPass(message) {
  console.log(`PASS ${message}`);
}

function resolveUrl(baseUrl, raw) {
  return new URL(String(raw || '').trim(), `${baseUrl}/`).toString();
}

async function verifyAudioUrl(baseUrl, audioUrl, timeoutMs, label) {
  const url = resolveUrl(baseUrl, audioUrl);
  const response = await fetchWithTimeout(
    url,
    {
      redirect: 'manual',
      headers: { accept: 'audio/*,application/octet-stream;q=0.9,*/*;q=0.8' },
    },
    timeoutMs
  );

  const contentType = response.headers.get('content-type') || '';
  assert(response.status === 200, `${label} audio returned ${response.status} instead of 200`);
  assert(
    AUDIO_CONTENT_TYPE_PATTERN.test(contentType),
    `${label} audio returned unexpected content-type ${contentType || '(missing)'}`
  );

  logPass(`${label} audio URL returned 200 with ${contentType}`);
}

async function verifyTtsPayload(baseUrl, payload, timeoutMs, label) {
  assert(payload && payload.success !== false, `${label} did not return success`);
  const data =
    payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object'
      ? payload.data
      : null;

  assert(data, `${label} response did not include data`);

  const audioUrl = typeof data.audioUrl === 'string' ? data.audioUrl.trim() : '';
  if (audioUrl) {
    await verifyAudioUrl(baseUrl, audioUrl, timeoutMs, label);
    return;
  }

  const audioBase64 = typeof data.audioBase64 === 'string' ? data.audioBase64.trim() : '';
  const mimeType = typeof data.mimeType === 'string' ? data.mimeType.trim() : '';

  assert(audioBase64.length > 100, `${label} did not return an audio URL or inline audio payload`);
  assert(
    AUDIO_CONTENT_TYPE_PATTERN.test(mimeType || 'audio/wav'),
    `${label} returned inline audio with unexpected mimeType ${mimeType || '(missing)'}`
  );

  logPass(`${label} returned inline audio payload (${mimeType || 'audio/wav'})`);
}

async function checkBreakingTts(baseUrl, timeoutMs) {
  const response = await fetchWithTimeout(
    resolveUrl(baseUrl, '/api/breaking?limit=1'),
    {
      redirect: 'manual',
      headers: { accept: 'application/json' },
    },
    timeoutMs
  );

  assert(response.status === 200, `/api/breaking returned ${response.status} instead of 200`);
  const payload = await readJson(response);
  const items = Array.isArray(payload?.items) ? payload.items : [];

  if (items.length === 0) {
    logPass('/api/breaking returned no live breaking items, so breaking TTS was skipped');
    return;
  }

  const topItem = items[0];
  const title = String(topItem?.title || '').trim() || 'Top breaking item';
  const audioUrl = String(topItem?.ttsAudioUrl || '').trim();

  assert(Boolean(topItem?.ttsReady), `${title} is missing ready breaking TTS metadata`);
  assert(audioUrl, `${title} is missing a breaking TTS audio URL`);

  await verifyAudioUrl(baseUrl, audioUrl, timeoutMs, `Breaking TTS for "${title}"`);
}

async function checkArticleTts(baseUrl, timeoutMs) {
  const ttsTimeoutMs = Math.max(timeoutMs, 90000);
  const latestResponse = await fetchWithTimeout(
    resolveUrl(baseUrl, '/api/articles/latest?limit=1'),
    {
      redirect: 'manual',
      headers: { accept: 'application/json' },
    },
    timeoutMs
  );

  assert(
    latestResponse.status === 200,
    `/api/articles/latest returned ${latestResponse.status} instead of 200`
  );

  const latestPayload = await readJson(latestResponse);
  const items = Array.isArray(latestPayload?.items) ? latestPayload.items : [];
  assert(items.length > 0, '/api/articles/latest returned no items');

  const article = items[0];
  const articleId = String(article?._id || article?.id || '').trim();
  assert(articleId, 'Latest article is missing an _id');

  const ttsResponse = await fetchWithTimeout(
    resolveUrl(baseUrl, `/api/articles/${encodeURIComponent(articleId)}/tts`),
    {
      method: 'POST',
      redirect: 'manual',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: '{}',
    },
    ttsTimeoutMs
  );

  assert(
    ttsResponse.status === 200,
    `Article TTS route returned ${ttsResponse.status} instead of 200 for ${articleId}`
  );

  const ttsPayload = await readJson(ttsResponse);
  await verifyTtsPayload(baseUrl, ttsPayload, timeoutMs, `Article TTS for ${articleId}`);
}

async function checkEpaperStoryTts(baseUrl, timeoutMs) {
  const ttsTimeoutMs = Math.max(timeoutMs, 90000);
  const latestResponse = await fetchWithTimeout(
    resolveUrl(baseUrl, '/api/epapers/latest?limit=5'),
    {
      redirect: 'manual',
      headers: { accept: 'application/json' },
    },
    timeoutMs
  );

  assert(
    latestResponse.status === 200,
    `/api/epapers/latest returned ${latestResponse.status} instead of 200`
  );

  const latestPayload = await readJson(latestResponse);
  const items = Array.isArray(latestPayload?.items) ? latestPayload.items : [];
  assert(items.length > 0, '/api/epapers/latest returned no items');

  let epaperId = '';
  let storyId = '';

  for (const paper of items) {
    const candidateEpaperId = String(paper?._id || '').trim();
    if (!candidateEpaperId) {
      continue;
    }

    const detailResponse = await fetchWithTimeout(
      resolveUrl(baseUrl, `/api/epapers/${encodeURIComponent(candidateEpaperId)}`),
      {
        redirect: 'manual',
        headers: { accept: 'application/json' },
      },
      ttsTimeoutMs
    );

    assert(
      detailResponse.status === 200,
      `/api/epapers/${candidateEpaperId} returned ${detailResponse.status} instead of 200`
    );

    const detailPayload = await readJson(detailResponse);
    const articles = Array.isArray(detailPayload?.data?.articles)
      ? detailPayload.data.articles
      : [];
    const story = articles.find((item) => {
      const excerpt = String(item?.excerpt || '').trim();
      const contentHtml = String(item?.contentHtml || '').trim();
      return Boolean(excerpt || contentHtml);
    });

    if (!story) {
      continue;
    }

    const candidateStoryId = String(story?._id || '').trim();
    if (!candidateStoryId) {
      continue;
    }

    epaperId = candidateEpaperId;
    storyId = candidateStoryId;
    break;
  }

  if (!epaperId || !storyId) {
    logPass('Skipped e-paper TTS smoke check because no readable public e-paper story was available in the latest 5 editions');
    return;
  }

  const ttsResponse = await fetchWithTimeout(
    resolveUrl(
      baseUrl,
      `/api/epapers/${encodeURIComponent(epaperId)}/articles/${encodeURIComponent(storyId)}/tts`
    ),
    {
      method: 'POST',
      redirect: 'manual',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: '{}',
    },
    ttsTimeoutMs
  );

  assert(
    ttsResponse.status === 200,
    `E-paper TTS route returned ${ttsResponse.status} instead of 200 for ${epaperId}/${storyId}`
  );

  const ttsPayload = await readJson(ttsResponse);
  await verifyTtsPayload(
    baseUrl,
    ttsPayload,
    timeoutMs,
    `E-paper story TTS for ${epaperId}/${storyId}`
  );
}

function printHelp() {
  console.log('Usage: npm run test:tts-smoke -- https://your-domain.com');
  console.log(
    '   or: npm run test:tts-smoke -- --baseUrl=https://your-domain.com --timeoutMs=45000'
  );
}

async function main() {
  const { help, baseUrl: baseUrlArg, timeoutMs } = parseArgs(process.argv.slice(2));
  if (help) {
    printHelp();
    return;
  }

  const baseUrl = normalizeBaseUrl(baseUrlArg);
  console.log(`TTS smoke checking ${baseUrl}`);

  await checkBreakingTts(baseUrl, timeoutMs);
  await checkArticleTts(baseUrl, timeoutMs);
  await checkEpaperStoryTts(baseUrl, timeoutMs);

  console.log('TTS smoke checks passed.');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`TTS smoke checks failed: ${message}`);
  process.exitCode = 1;
});
