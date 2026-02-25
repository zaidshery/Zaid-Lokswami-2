import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { normalizeRedirectPath } from '@/lib/auth/redirect';
import { getJwtSecretOrNull } from '@/lib/auth/jwtSecret';

const ADMIN_AUTH_COOKIE = 'auth-token';

function base64UrlToUint8Array(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function verifyAdminJwtInEdge(token: string, secret: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerSegment, payloadSegment, signatureSegment] = parts;
    const data = `${headerSegment}.${payloadSegment}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToUint8Array(signatureSegment),
      new TextEncoder().encode(data)
    );

    if (!isValid) return null;

    const payloadText = new TextDecoder().decode(
      base64UrlToUint8Array(payloadSegment)
    );
    const payload = JSON.parse(payloadText) as Record<string, unknown>;

    if (!payload || typeof payload !== 'object') return null;
    if (payload.role !== 'admin') return null;

    const exp = payload.exp;
    if (typeof exp === 'number' && Date.now() >= exp * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = getJwtSecretOrNull();
  const token = request.cookies.get(ADMIN_AUTH_COOKIE)?.value || '';
  const adminPayload =
    token && secret ? await verifyAdminJwtInEdge(token, secret) : null;

  if (pathname.startsWith('/admin')) {
    if (!adminPayload) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === '/login') {
    if (adminPayload) {
      const redirectTo = normalizeRedirectPath(
        request.nextUrl.searchParams.get('redirect'),
        '/admin'
      );
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
