import { NextRequest, NextResponse } from 'next/server';
import { normalizeRedirectPath } from '@/lib/auth/redirect';
import {
  fetchOidcDiscoveryDocument,
  getOidcServerConfig,
  isOidcConfigured,
  randomState,
  resolveOidcRedirectUri,
} from '@/lib/auth/oidc';

const OIDC_STATE_COOKIE = 'oidc-state';
const OIDC_STATE_MAX_AGE_SECONDS = 60 * 10;

type OidcStatePayload = {
  state: string;
  nonce: string;
  redirectTo: string;
};

function encodeState(payload: OidcStatePayload) {
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
}

export async function GET(req: NextRequest) {
  try {
    if (!isOidcConfigured()) {
      const fallback = new URL('/main/account', req.url);
      fallback.searchParams.set('authError', 'oidc_not_configured');
      return NextResponse.redirect(fallback);
    }

    const { issuer, clientId, scopes, prompt } = getOidcServerConfig();
    const redirectTo = normalizeRedirectPath(
      req.nextUrl.searchParams.get('redirect'),
      '/main/account'
    );

    const discovery = await fetchOidcDiscoveryDocument(issuer);
    const state = randomState(36);
    const nonce = randomState(36);
    const redirectUri = resolveOidcRedirectUri(req.nextUrl.origin);

    const url = new URL(discovery.authorization_endpoint!);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', scopes);
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    if (prompt) {
      url.searchParams.set('prompt', prompt);
    }

    const response = NextResponse.redirect(url);
    response.cookies.set({
      name: OIDC_STATE_COOKIE,
      value: encodeState({ state, nonce, redirectTo }),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: OIDC_STATE_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error('OIDC start failed:', error);
    const fallback = new URL('/main/account', req.url);
    fallback.searchParams.set('authError', 'oidc_start_failed');
    return NextResponse.redirect(fallback);
  }
}
