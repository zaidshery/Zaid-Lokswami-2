import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { normalizeRedirectPath } from '@/lib/auth/redirect';
import { isAdminRole } from '@/lib/auth/roles';
import SignInPageClient from './SignInPageClient';

const POST_AUTH_QUERY_PARAM = 'postAuth';
const ADMIN_BANNER_QUERY_PARAM = 'adminBanner';

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

function isAdminOnlyTarget(path: string) {
  return path === '/admin' || path.startsWith('/admin/');
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null;
  }

  return typeof value === 'string' ? value : null;
}

function resolvePostSignInRedirect(value: string | null): string | null {
  const next = (value || '').trim();
  if (!next) {
    return null;
  }

  const normalizedPath = normalizeRedirectPath(next, '');
  if (!normalizedPath) {
    return null;
  }

  if (normalizedPath === '/signin' || normalizedPath === '/login') {
    return '/main';
  }

  if (normalizedPath.startsWith('/signin?') || normalizedPath.startsWith('/login?')) {
    const nestedParams = new URLSearchParams(normalizedPath.split('?')[1] || '');
    return (
      resolvePostSignInRedirect(nestedParams.get('redirect')) ||
      resolvePostSignInRedirect(nestedParams.get('callbackUrl')) ||
      '/main'
    );
  }

  return normalizedPath;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const redirectTo =
    resolvePostSignInRedirect(readSearchParam(params.redirect)) ||
    resolvePostSignInRedirect(readSearchParam(params.callbackUrl)) ||
    '/main';
  const isPostAuth = readSearchParam(params[POST_AUTH_QUERY_PARAM]) === '1';
  const shouldShowAdminBanner =
    readSearchParam(params[ADMIN_BANNER_QUERY_PARAM]) === '1';
  const errorKey = readSearchParam(params.error);
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.email);
  const isAdminSession =
    isAdminRole(session?.user?.role) && session?.user?.isActive !== false;

  if (isAuthenticated && errorKey !== 'inactive' && errorKey !== 'no_admin_access') {
    if (!isPostAuth) {
      redirect('/main');
    }

    if (isAdminSession) {
      if (shouldShowAdminBanner) {
        return <SignInPageClient />;
      }

      redirect('/admin');
    }

    if (isAdminOnlyTarget(redirectTo)) {
      redirect('/signin?error=no_admin_access');
    }

    redirect(redirectTo);
  }

  return <SignInPageClient />;
}
