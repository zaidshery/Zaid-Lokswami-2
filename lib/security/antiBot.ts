const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

type AntiBotVerifyInput = {
  turnstileToken?: string;
  recaptchaToken?: string;
  remoteIp?: string;
};

export type AntiBotVerifyResult = {
  ok: boolean;
  provider: 'none' | 'turnstile' | 'recaptcha';
  error?: string;
};

function cleanToken(value: unknown) {
  return String(value ?? '').trim();
}

function resolveRecaptchaScoreThreshold() {
  const threshold = Number.parseFloat(
    String(process.env.RECAPTCHA_MIN_SCORE || '0.5').trim()
  );
  if (!Number.isFinite(threshold)) return 0.5;
  return Math.min(1, Math.max(0, threshold));
}

async function verifyTurnstileToken(
  token: string,
  remoteIp: string
): Promise<AntiBotVerifyResult> {
  const secret = String(process.env.TURNSTILE_SECRET_KEY || '').trim();
  if (!secret) {
    return { ok: true, provider: 'none' };
  }

  if (!token) {
    return {
      ok: false,
      provider: 'turnstile',
      error: 'Missing anti-bot verification token',
    };
  }

  try {
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);
    if (remoteIp) {
      body.set('remoteip', remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        ok: false,
        provider: 'turnstile',
        error: 'Anti-bot verification service unavailable',
      };
    }

    const payload = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      'error-codes'?: string[];
    };

    if (!payload.success) {
      return {
        ok: false,
        provider: 'turnstile',
        error:
          payload['error-codes']?.[0] ||
          'Anti-bot verification failed. Please try again.',
      };
    }

    return { ok: true, provider: 'turnstile' };
  } catch {
    return {
      ok: false,
      provider: 'turnstile',
      error: 'Anti-bot verification failed. Please try again.',
    };
  }
}

async function verifyRecaptchaToken(
  token: string,
  remoteIp: string
): Promise<AntiBotVerifyResult> {
  const secret = String(process.env.RECAPTCHA_SECRET_KEY || '').trim();
  if (!secret) {
    return { ok: true, provider: 'none' };
  }

  if (!token) {
    return {
      ok: false,
      provider: 'recaptcha',
      error: 'Missing anti-bot verification token',
    };
  }

  try {
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);
    if (remoteIp) {
      body.set('remoteip', remoteIp);
    }

    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        ok: false,
        provider: 'recaptcha',
        error: 'Anti-bot verification service unavailable',
      };
    }

    const payload = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      score?: number;
      'error-codes'?: string[];
    };

    if (!payload.success) {
      return {
        ok: false,
        provider: 'recaptcha',
        error:
          payload['error-codes']?.[0] ||
          'Anti-bot verification failed. Please try again.',
      };
    }

    if (
      typeof payload.score === 'number' &&
      payload.score < resolveRecaptchaScoreThreshold()
    ) {
      return {
        ok: false,
        provider: 'recaptcha',
        error: 'Suspicious request detected. Please try again later.',
      };
    }

    return { ok: true, provider: 'recaptcha' };
  } catch {
    return {
      ok: false,
      provider: 'recaptcha',
      error: 'Anti-bot verification failed. Please try again.',
    };
  }
}

export async function verifyAntiBot(input: AntiBotVerifyInput) {
  const remoteIp = String(input.remoteIp || '').trim();
  const turnstileToken = cleanToken(input.turnstileToken);
  const recaptchaToken = cleanToken(input.recaptchaToken);

  const hasTurnstileSecret = Boolean(
    String(process.env.TURNSTILE_SECRET_KEY || '').trim()
  );
  if (hasTurnstileSecret) {
    return verifyTurnstileToken(turnstileToken, remoteIp);
  }

  const hasRecaptchaSecret = Boolean(
    String(process.env.RECAPTCHA_SECRET_KEY || '').trim()
  );
  if (hasRecaptchaSecret) {
    return verifyRecaptchaToken(recaptchaToken, remoteIp);
  }

  return { ok: true, provider: 'none' } as AntiBotVerifyResult;
}
