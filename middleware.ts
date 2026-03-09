import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { LOKSWAMI_SESSION_COOKIE } from '@/lib/auth/cookies';
import { normalizeRedirectPath } from '@/lib/auth/redirect';
import { getJwtSecretOrNull } from '@/lib/auth/jwtSecret';

const READER_PROTECTED_PREFIXES = ['/main/saved', '/main/preferences'];

function isReaderProtectedPath(pathname: string) {
  return READER_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

async function getSessionToken(request: NextRequest) {
  const secret = getJwtSecretOrNull();
  if (!secret) {
    return null;
  }

  return getToken({
    req: request,
    secret,
    cookieName: LOKSWAMI_SESSION_COOKIE,
  });
}

/** Protects admin and signed-in reader routes with the active NextAuth session. */
export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    const session = await getSessionToken(request);
    const email = typeof session?.email === 'string' ? session.email.trim() : '';
    const isAuthenticated = Boolean(email);
    const isAdmin = session?.role === 'admin';

    if (pathname.startsWith('/admin')) {
      if (!isAdmin) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      return NextResponse.next();
    }

    if (pathname === '/login') {
      if (isAdmin) {
        const redirectTo = normalizeRedirectPath(
          request.nextUrl.searchParams.get('redirect'),
          '/admin'
        );
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }

      return NextResponse.next();
    }

    if (pathname === '/signin') {
      return NextResponse.next();
    }

    if (isReaderProtectedPath(pathname) && !isAuthenticated) {
      const signInUrl = new URL('/signin', request.url);
      signInUrl.searchParams.set(
        'redirect',
        `${pathname}${request.nextUrl.search}`
      );
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware auth check failed:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/login',
    '/signin',
    '/main/saved/:path*',
    '/main/preferences/:path*',
  ],
};
