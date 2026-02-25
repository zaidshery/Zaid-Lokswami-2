export type BhashiniTtsSuccess = {
  mode: 'bhashini';
  audioUrl?: string;
  audioBase64?: string;
  mimeType?: string;
};

export type BhashiniTtsUnavailable = {
  mode: 'unavailable';
  reason: string;
};

type BhashiniTtsResult = BhashiniTtsSuccess | BhashiniTtsUnavailable;

type UnknownJson = Record<string, unknown>;

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function parseExtraHeaders(value: string | undefined) {
  if (!value) return {} as Record<string, string>;
  try {
    const parsed = JSON.parse(value) as UnknownJson;
    const headers: Record<string, string> = {};
    Object.entries(parsed).forEach(([key, item]) => {
      if (typeof item === 'string') headers[key] = item;
    });
    return headers;
  } catch {
    return {} as Record<string, string>;
  }
}

function findFirstString(source: unknown, keys: string[]): string {
  if (!source || typeof source !== 'object') return '';
  const record = source as UnknownJson;
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return '';
}

function extractAudioFromJson(payload: unknown) {
  if (!payload || typeof payload !== 'object') return { audioUrl: '', audioBase64: '' };
  const root = payload as UnknownJson;

  const directAudioUrl = findFirstString(root, ['audioUrl', 'audio_url', 'url']);
  const directAudioBase64 = findFirstString(root, ['audioBase64', 'audio_base64', 'audioContent']);
  if (directAudioUrl || directAudioBase64) {
    return { audioUrl: directAudioUrl, audioBase64: directAudioBase64 };
  }

  const data = root.data;
  if (data && typeof data === 'object') {
    const nestedUrl = findFirstString(data, ['audioUrl', 'audio_url', 'url']);
    const nestedBase64 = findFirstString(data, ['audioBase64', 'audio_base64', 'audioContent']);
    if (nestedUrl || nestedBase64) {
      return { audioUrl: nestedUrl, audioBase64: nestedBase64 };
    }
  }

  return { audioUrl: '', audioBase64: '' };
}

export async function synthesizeBhashiniSpeech(params: {
  text: string;
  languageCode: string;
  voice?: string;
}): Promise<BhashiniTtsResult> {
  const endpoint = process.env.BHASHINI_TTS_API_URL?.trim();
  if (!endpoint) {
    return {
      mode: 'unavailable',
      reason: 'BHASHINI_TTS_API_URL is not configured.',
    };
  }

  const apiKey = process.env.BHASHINI_API_KEY?.trim();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...parseExtraHeaders(process.env.BHASHINI_TTS_HEADERS_JSON),
  };
  if (apiKey && !headers.Authorization) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const payload = {
    text: params.text,
    languageCode: params.languageCode,
    voice: params.voice || process.env.BHASHINI_TTS_VOICE || '',
    format: 'mp3',
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      return {
        mode: 'unavailable',
        reason: `Bhashini request failed (${response.status}) ${details}`.trim(),
      };
    }

    if (contentType.startsWith('audio/')) {
      const bytes = await response.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      return {
        mode: 'bhashini',
        audioBase64: base64,
        mimeType: contentType,
      };
    }

    const payloadJson = (await response.json().catch(() => ({}))) as unknown;
    const extracted = extractAudioFromJson(payloadJson);
    if (extracted.audioUrl || extracted.audioBase64) {
      return {
        mode: 'bhashini',
        audioUrl: extracted.audioUrl || undefined,
        audioBase64: extracted.audioBase64 || undefined,
        mimeType: 'audio/mpeg',
      };
    }

    return {
      mode: 'unavailable',
      reason: 'Bhashini response did not include audioUrl or audioBase64.',
    };
  } catch (error) {
    return {
      mode: 'unavailable',
      reason: `Bhashini request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
