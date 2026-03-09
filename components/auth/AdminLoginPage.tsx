'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2, Moon, ShieldCheck, Sun } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import Logo from '@/components/layout/Logo';
import AuthButton from '@/components/auth/AuthButton';
import { useAppStore } from '@/lib/store/appStore';
import { normalizeRedirectPath } from '@/lib/auth/redirect';

const AUTH_INTENT_COOKIE = 'lokswami-auth-intent';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: 'This Google account is not allowed to access the Lokswami admin.',
  OAuthSignin: 'Unable to start Google sign-in. Please try again.',
  OAuthCallback: 'Google authentication callback failed. Please try again.',
  OAuthCreateAccount: 'Unable to create the admin session. Please try again.',
  Configuration:
    'Google admin auth is not configured yet. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET, and NEXTAUTH_URL.',
  Default: 'Google authentication failed. Please try again.',
};

interface AdminLoginPageProps {
  isGoogleAuthConfigured: boolean;
}

function setAuthIntentCookie(intent: 'admin' | 'reader') {
  document.cookie = `${AUTH_INTENT_COOKIE}=${intent}; Path=/; Max-Age=600; SameSite=Lax`;
}

function clearAuthIntentCookie() {
  document.cookie = `${AUTH_INTENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.33-1.54 3.9-5.5 3.9-3.31 0-6-2.76-6-6.2S8.69 5.6 12 5.6c1.88 0 3.13.8 3.85 1.48l2.63-2.58C16.87 2.97 14.69 2 12 2 6.93 2 2.82 6.48 2.82 12S6.93 22 12 22c5.19 0 8.61-3.65 8.61-8.8 0-.59-.06-1.02-.14-1.4H12Z"
      />
      <path
        fill="#34A853"
        d="M3.8 7.23 7 9.58C7.87 7.09 9.76 5.6 12 5.6c1.88 0 3.13.8 3.85 1.48l2.63-2.58C16.87 2.97 14.69 2 12 2 8.4 2 5.27 4.05 3.8 7.23Z"
      />
      <path
        fill="#FBBC05"
        d="M12 22c2.64 0 4.86-.87 6.48-2.37l-3-2.45c-.83.6-1.9 1.02-3.48 1.02-2.22 0-4.1-1.48-5-3.54l-3.1 2.39C5.34 19.85 8.45 22 12 22Z"
      />
      <path
        fill="#4285F4"
        d="M20.61 13.2c0-.6-.05-1.16-.14-1.69H12v3.9h4.84c-.21 1.08-.82 1.99-1.84 2.67l3 2.45c1.75-1.63 2.61-4.03 2.61-7.33Z"
      />
    </svg>
  );
}

function resolveAuthError(errorKey: string | null) {
  if (!errorKey) {
    return '';
  }

  return AUTH_ERROR_MESSAGES[errorKey] || AUTH_ERROR_MESSAGES.Default;
}

/** Client-side admin login screen backed by NextAuth Google OAuth. */
export default function AdminLoginPage({
  isGoogleAuthConfigured,
}: AdminLoginPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useAppStore();
  const [errorMessage, setErrorMessage] = useState('');
  const [isStartingGoogle, setIsStartingGoogle] = useState(false);
  const [isSyncingAdminSession, setIsSyncingAdminSession] = useState(false);
  const [hasAttemptedSessionSync, setHasAttemptedSessionSync] = useState(false);

  const redirectTo = useMemo(
    () => normalizeRedirectPath(searchParams.get('redirect'), '/admin'),
    [searchParams]
  );

  const userName =
    session?.user?.name?.trim() ||
    session?.user?.email?.split('@')[0]?.trim() ||
    'Admin';
  const userEmail = session?.user?.email?.trim() || '';
  const isApprovedAdmin = session?.user?.role === 'admin';

  const finalizeAdminLogin = useCallback(async () => {
    setErrorMessage('');
    setIsSyncingAdminSession(true);

    try {
      clearAuthIntentCookie();
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setErrorMessage('Failed to finish admin login. Please try again.');
      setIsSyncingAdminSession(false);
    }
  }, [redirectTo, router]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setHasAttemptedSessionSync(false);
      return;
    }

    clearAuthIntentCookie();

    if (!isApprovedAdmin || hasAttemptedSessionSync) {
      return;
    }

    setHasAttemptedSessionSync(true);
    void finalizeAdminLogin();
  }, [finalizeAdminLogin, hasAttemptedSessionSync, isApprovedAdmin, status]);

  useEffect(() => {
    if (status === 'authenticated') {
      return;
    }

    setErrorMessage(resolveAuthError(searchParams.get('error')));
  }, [searchParams, status]);

  async function handleGoogleSignIn() {
    if (!isGoogleAuthConfigured) {
      setErrorMessage(AUTH_ERROR_MESSAGES.Configuration);
      return;
    }

    setErrorMessage('');
    setIsStartingGoogle(true);
    setAuthIntentCookie('admin');

      try {
        const result = await signIn('google', {
          redirect: false,
          redirectTo: `/login?redirect=${encodeURIComponent(redirectTo)}`,
        });

      if (result?.error) {
        clearAuthIntentCookie();
        setErrorMessage(resolveAuthError(result.error));
        setIsStartingGoogle(false);
        return;
      }

        if (result?.url) {
          window.location.assign(result.url);
          return;
        }

      clearAuthIntentCookie();
      setErrorMessage(AUTH_ERROR_MESSAGES.Default);
      setIsStartingGoogle(false);
    } catch {
      clearAuthIntentCookie();
      setErrorMessage(AUTH_ERROR_MESSAGES.Default);
      setIsStartingGoogle(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-100 px-4 py-10 transition-colors dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(244,244,245,0.92))] dark:bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.22),transparent_28%),linear-gradient(180deg,rgba(9,9,11,0.85),rgba(9,9,11,0.98))]" />
      <div className="pointer-events-none absolute -left-16 top-14 h-64 w-64 rounded-full bg-red-200/60 blur-3xl dark:bg-red-500/15" />
      <div className="pointer-events-none absolute -right-16 bottom-8 h-72 w-72 rounded-full bg-orange-100/80 blur-3xl dark:bg-orange-400/10" />

      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-700 shadow-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-7 text-center">
          <div className="mx-auto inline-flex">
            <Logo size="lg" href="/" />
          </div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-red-600 dark:text-red-400">
            Admin Access
          </p>
          <h1 className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-100">
            Continue with Google
          </h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Only approved Lokswami admin email addresses can access the admin panel.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/88 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Secure admin login</span>
          </div>

          {errorMessage ? (
            <div className="mt-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {status === 'loading' ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-5 text-center dark:border-zinc-700 dark:bg-zinc-950">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary-600" />
              <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Checking session...
              </p>
            </div>
          ) : userEmail ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-700 dark:bg-zinc-950">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Signed in
                </p>
                <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {userName}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {userEmail}
                </p>
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {isApprovedAdmin
                    ? isSyncingAdminSession
                      ? 'Finalizing your admin session...'
                      : 'Admin account verified. You can continue into the dashboard.'
                    : 'This account is signed in, but it is not on the admin allowlist.'}
                </p>
              </div>

              {isApprovedAdmin && isSyncingAdminSession ? (
                <div className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Redirecting to admin...</span>
                </div>
              ) : isApprovedAdmin ? (
                <button
                  type="button"
                  onClick={() => void finalizeAdminLogin()}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700"
                >
                  Continue to Admin
                </button>
              ) : null}

              <AuthButton redirectTo="/login" className="w-full" />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                disabled={isStartingGoogle || !isGoogleAuthConfigured}
                className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                {isStartingGoogle ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <GoogleGlyph />
                )}
                <span>
                  {isStartingGoogle ? 'Redirecting to Google...' : 'Continue with Google'}
                </span>
              </button>

              {!isGoogleAuthConfigured ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/25 dark:text-amber-300">
                  Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and
                  `NEXTAUTH_URL` before using Google admin login.
                </div>
              ) : null}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
