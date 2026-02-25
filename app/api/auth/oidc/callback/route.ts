import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongoose';
import ReaderUser from '@/lib/models/ReaderUser';
import {
  generateReaderToken,
  setReaderAuthCookie,
  type ReaderTokenPayload,
} from '@/lib/auth/readerToken';
import { getJwtSecretOrNull } from '@/lib/auth/jwtSecret';
import {
  exchangeOidcAuthorizationCode,
  getOidcServerConfig,
  isOidcConfigured,
  resolveOidcRedirectUri,
} from '@/lib/auth/oidc';

const OIDC_STATE_COOKIE = 'oidc-state';

type OidcStatePayload = {
  state: string;
  nonce: string;
  redirectTo: string;
};

function decodeState(raw: string): OidcStatePayload | null {
  if (!raw) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf-8')
    ) as OidcStatePayload;

    if (!payload || typeof payload !== 'object') return null;
    if (!payload.state || !payload.redirectTo) return null;

    return {
      state: String(payload.state),
      nonce: String(payload.nonce || ''),
      redirectTo: String(payload.redirectTo),
    };
  } catch {
    return null;
  }
}

function withAuthError(req: NextRequest, code: string) {
  const url = new URL('/main/account', req.url);
  url.searchParams.set('authError', code);
  const response = NextResponse.redirect(url);
  response.cookies.set({
    name: OIDC_STATE_COOKIE,
    value: '',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function GET(req: NextRequest) {
  try {
    if (!isOidcConfigured()) {
      return withAuthError(req, 'oidc_not_configured');
    }

    if (!process.env.MONGODB_URI) {
      return withAuthError(req, 'auth_service_unavailable');
    }

    if (!getJwtSecretOrNull()) {
      return withAuthError(req, 'auth_secret_missing');
    }

    const error = req.nextUrl.searchParams.get('error');
    if (error) {
      return withAuthError(req, 'oidc_denied');
    }

    const code = String(req.nextUrl.searchParams.get('code') || '').trim();
    const state = String(req.nextUrl.searchParams.get('state') || '').trim();

    const cookieState = decodeState(req.cookies.get(OIDC_STATE_COOKIE)?.value || '');
    if (!code || !state || !cookieState || cookieState.state !== state) {
      return withAuthError(req, 'oidc_state_invalid');
    }

    const { issuer, clientId, clientSecret } = getOidcServerConfig();
    const redirectUri = resolveOidcRedirectUri(req.nextUrl.origin);

    const exchange = await exchangeOidcAuthorizationCode({
      issuer,
      code,
      redirectUri,
      clientId,
      clientSecret,
    });

    await connectDB();

    let user = await ReaderUser.findOne({ email: exchange.profile.email });

    if (!user) {
      const passwordHash = await bcrypt.hash(`${randomUUID()}-${Date.now()}`, 12);
      user = await ReaderUser.create({
        name: exchange.profile.name,
        email: exchange.profile.email,
        passwordHash,
        authProvider: 'oidc',
        oidcSubject: exchange.profile.subject,
        wantsDailyAlerts: false,
        lastLoginAt: new Date(),
      });
    } else {
      let changed = false;

      if (exchange.profile.name && user.name !== exchange.profile.name) {
        user.name = exchange.profile.name;
        changed = true;
      }

      if (user.authProvider !== 'oidc') {
        user.authProvider = 'oidc';
        changed = true;
      }

      if (exchange.profile.subject && user.oidcSubject !== exchange.profile.subject) {
        user.oidcSubject = exchange.profile.subject;
        changed = true;
      }

      user.lastLoginAt = new Date();
      changed = true;

      if (changed) {
        await user.save();
      }
    }

    const payload: ReaderTokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: 'reader',
    };

    const readerToken = generateReaderToken(payload);
    const redirectUrl = new URL(cookieState.redirectTo || '/main/account', req.url);
    redirectUrl.searchParams.set('authSuccess', 'oidc');

    const response = NextResponse.redirect(redirectUrl);
    setReaderAuthCookie(response, readerToken);
    response.cookies.set({
      name: OIDC_STATE_COOKIE,
      value: '',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('OIDC callback failed:', error);
    return withAuthError(req, 'oidc_callback_failed');
  }
}
