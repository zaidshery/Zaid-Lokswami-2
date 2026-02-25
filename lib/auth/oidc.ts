import crypto from 'crypto';

export type OidcDiscoveryDocument = {
  authorization_endpoint?: string;
  token_endpoint?: string;
  userinfo_endpoint?: string;
};

export type OidcProfile = {
  subject: string;
  email: string;
  name: string;
};

function clean(value: unknown, max: number) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

export function getOidcServerConfig() {
  const issuer = clean(process.env.OIDC_ISSUER_URL, 300).replace(/\/+$/, '');
  const clientId = clean(process.env.OIDC_CLIENT_ID, 200);
  const clientSecret = clean(process.env.OIDC_CLIENT_SECRET, 300);
  const scopes = clean(process.env.OIDC_SCOPES || 'openid profile email', 120);
  const prompt = clean(process.env.OIDC_PROMPT || 'select_account', 60);

  return {
    issuer,
    clientId,
    clientSecret,
    scopes,
    prompt,
  };
}

export function isOidcConfigured() {
  const { issuer, clientId, clientSecret } = getOidcServerConfig();
  return Boolean(issuer && clientId && clientSecret);
}

export function resolveOidcRedirectUri(origin: string) {
  const configured = clean(process.env.OIDC_REDIRECT_URI, 300);
  if (configured) return configured;

  const normalizedOrigin = clean(origin, 300).replace(/\/+$/, '');
  return `${normalizedOrigin}/api/auth/oidc/callback`;
}

export async function fetchOidcDiscoveryDocument(issuer: string) {
  const url = `${issuer}/.well-known/openid-configuration`;
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('OIDC discovery failed');
  }

  const payload = (await response.json()) as OidcDiscoveryDocument;
  if (!payload.authorization_endpoint || !payload.token_endpoint) {
    throw new Error('OIDC discovery document is incomplete');
  }

  return payload;
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, 'base64').toString('utf-8');
}

function parseIdTokenPayload(idToken: string) {
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as Record<string, unknown>;
    return payload;
  } catch {
    return null;
  }
}

export function randomState(length = 32) {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, length);
  }
  return crypto.randomBytes(32).toString('hex').slice(0, length);
}

export async function exchangeOidcAuthorizationCode(input: {
  issuer: string;
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}) {
  const discovery = await fetchOidcDiscoveryDocument(input.issuer);

  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', input.code);
  body.set('redirect_uri', input.redirectUri);
  body.set('client_id', input.clientId);
  body.set('client_secret', input.clientSecret);

  const tokenResponse = await fetch(discovery.token_endpoint!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!tokenResponse.ok) {
    throw new Error('OIDC token exchange failed');
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    id_token?: string;
  };

  const accessToken = clean(tokenPayload.access_token, 4000);
  const idToken = clean(tokenPayload.id_token, 6000);

  if (!accessToken && !idToken) {
    throw new Error('OIDC token response missing tokens');
  }

  let profile: OidcProfile | null = null;

  if (discovery.userinfo_endpoint && accessToken) {
    const userinfoResponse = await fetch(discovery.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (userinfoResponse.ok) {
      const userinfo = (await userinfoResponse.json()) as Record<string, unknown>;
      const email = clean(userinfo.email, 180).toLowerCase();
      const name = clean(userinfo.name || userinfo.preferred_username, 120);
      const subject = clean(userinfo.sub, 180);

      if (email && subject) {
        profile = {
          subject,
          email,
          name: name || email.split('@')[0] || 'Reader',
        };
      }
    }
  }

  if (!profile && idToken) {
    const tokenBody = parseIdTokenPayload(idToken);
    if (tokenBody) {
      const email = clean(tokenBody.email, 180).toLowerCase();
      const name = clean(tokenBody.name || tokenBody.preferred_username, 120);
      const subject = clean(tokenBody.sub, 180);

      if (email && subject) {
        profile = {
          subject,
          email,
          name: name || email.split('@')[0] || 'Reader',
        };
      }
    }
  }

  if (!profile) {
    throw new Error('OIDC profile could not be resolved');
  }

  return { discovery, profile };
}
