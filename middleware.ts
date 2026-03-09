import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { LOKSWAMI_SESSION_COOKIE } from '@/lib/auth/cookies';
import { isAdminRole } from '@/lib/auth/roles';
import { normalizeRedirectPath } from '@/lib/auth/redirect';
import { getJwtSecretOrNull } from '@/lib/auth/jwtSecret';

const READER_PROTECTED_PREFIXES = [
  '/main/account',
  '/main/saved',
  '/main/preferences',
];

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
    const userId = typeof session?.userId === 'string' ? session.userId.trim() : '';
    const role = session?.role;
    const isActive = session?.isActive !== false;
    const isAuthenticated = Boolean(email || userId);
    const hasAdminAccess = isAdminRole(role) && isActive;
    const originalTarget = `${pathname}${request.nextUrl.search}`;

    if (pathname.startsWith('/admin')) {
      if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set(
          'redirect',
          normalizeRedirectPath(originalTarget, '/admin')
        );
        return NextResponse.redirect(loginUrl);
      }

      if (!hasAdminAccess) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'wrong_account');
        loginUrl.searchParams.set('redirect', '/admin');
        return NextResponse.redirect(loginUrl);
      }

      return NextResponse.next();
    }

    if (pathname === '/login') {
      if (hasAdminAccess) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }

      return NextResponse.next();
    }

    if (pathname === '/signin') {
      if (isAuthenticated) {
        return NextResponse.redirect(new URL('/main', request.url));
      }

      return NextResponse.next();
    }

    if (isReaderProtectedPath(pathname) && !isAuthenticated) {
      const signInUrl = new URL('/signin', request.url);
      signInUrl.searchParams.set('redirect', originalTarget);
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
    '/main/account/:path*',
    '/main/saved/:path*',
    '/main/preferences/:path*',
  ],
};
