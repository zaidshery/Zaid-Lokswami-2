'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, Moon, Sun } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import Logo from '@/components/layout/Logo';
import { useAppStore } from '@/lib/store/appStore';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: 'Google sign-in was denied. Please allow access and try again.',
  OAuthSignin: 'Unable to start Google sign-in. Please try again.',
  OAuthCallback: 'Google authentication callback failed. Please try again.',
  OAuthCreateAccount: 'Unable to create your account with Google.',
  Configuration: 'Authentication is not configured correctly on the server.',
  Default: 'Google authentication failed. Please try again.',
};
const AUTH_INTENT_COOKIE = 'lokswami-auth-intent';

function setReaderAuthIntentCookie() {
  document.cookie = `${AUTH_INTENT_COOKIE}=reader; Path=/; Max-Age=600; SameSite=Lax`;
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

function normalizeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/main';
  }

  return value;
}

function resolveAuthError(errorKey: string | null): string {
  if (!errorKey) {
    return '';
  }

  return AUTH_ERROR_MESSAGES[errorKey] || AUTH_ERROR_MESSAGES.Default;
}

const formContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const formItemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: 'easeOut',
    },
  },
};

function ThemeToggleButton({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useAppStore();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 ${className}`}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function FeaturePill({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-sm text-zinc-300 ${className}`}
    >
      {children}
    </div>
  );
}

function AuthFormContent({
  errorMessage,
  isSigningIn,
  onGoogleSignIn,
}: {
  errorMessage: string;
  isSigningIn: boolean;
  onGoogleSignIn: () => Promise<void>;
}) {
  return (
    <motion.div
      variants={formContainerVariants}
      initial="hidden"
      animate="show"
      className="w-full"
    >
      <motion.div variants={formItemVariants}>
        <h1 className="text-center text-2xl font-black text-zinc-900 dark:text-zinc-100">
          à¤¨à¤®à¤¸à¥à¤¤à¥‡! ðŸ‘‹
        </h1>
      </motion.div>

      <motion.div variants={formItemVariants}>
        <p className="mt-1 mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Sign in to your Lokswami account
        </p>
      </motion.div>

      {errorMessage ? (
        <motion.div
          variants={formItemVariants}
          className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{errorMessage}</span>
        </motion.div>
      ) : null}

      <motion.div variants={formItemVariants}>
        <motion.button
          type="button"
          onClick={() => void onGoogleSignIn()}
          disabled={isSigningIn}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-white px-4 text-sm font-semibold text-[#3c4043] shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSigningIn ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <GoogleGlyph />
          )}
          <span>
            {isSigningIn ? 'Redirecting to Google...' : 'Continue with Google'}
          </span>
        </motion.button>
      </motion.div>

      <motion.div variants={formItemVariants} className="my-5 flex items-center gap-3">
        <span className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          or
        </span>
        <span className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
      </motion.div>

      <motion.div variants={formItemVariants}>
        <motion.div whileHover={{ scale: 1.01 }}>
          <Link
            href="/main"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border-2 border-[#e63946] bg-transparent px-4 text-sm font-semibold text-[#e63946] transition hover:bg-[#e63946] hover:text-white"
          >
            Continue as Guest â†’
          </Link>
        </motion.div>
      </motion.div>

      <motion.p
        variants={formItemVariants}
        className="mt-6 text-center text-xs text-zinc-400"
      >
        By signing in, you agree to our{' '}
        <Link href="#" className="text-zinc-600 underline dark:text-zinc-300">
          Terms
        </Link>{' '}
        &{' '}
        <Link href="#" className="text-zinc-600 underline dark:text-zinc-300">
          Privacy Policy
        </Link>
      </motion.p>
    </motion.div>
  );
}

/** Renders the reader-facing Google sign-in screen. */
function SignInPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const callbackUrl = normalizeRedirectPath(searchParams.get('redirect'));

  useEffect(() => {
    if (status === 'authenticated') {
      clearAuthIntentCookie();
      router.replace(callbackUrl);
    }
  }, [callbackUrl, router, status]);

  useEffect(() => {
    setErrorMessage(resolveAuthError(searchParams.get('error')));
  }, [searchParams]);

  async function handleGoogleSignIn(): Promise<void> {
    setErrorMessage('');
    setIsSigningIn(true);
    setReaderAuthIntentCookie();

      try {
        const result = await signIn('google', {
          redirect: false,
          redirectTo: callbackUrl,
        });

      if (result?.error) {
        clearAuthIntentCookie();
        setErrorMessage(resolveAuthError(result.error));
        setIsSigningIn(false);
        return;
      }

        if (result?.url) {
          window.location.assign(result.url);
          return;
        }

      clearAuthIntentCookie();
      setErrorMessage(AUTH_ERROR_MESSAGES.Default);
      setIsSigningIn(false);
    } catch (error) {
      clearAuthIntentCookie();
      const message =
        error instanceof Error ? error.message : AUTH_ERROR_MESSAGES.Default;
      setErrorMessage(message);
      setIsSigningIn(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#09090b_0%,#18181b_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(230,57,70,0.2),transparent_32%)]" />

      <div className="lg:hidden">
        <ThemeToggleButton className="fixed top-4 right-4 z-50" />

        <div className="relative flex min-h-screen flex-col px-4 py-10 md:px-8 md:py-14">
          <div className="mx-auto w-full max-w-4xl">
            <div className="text-center">
              <div className="inline-flex">
                <Logo size="lg" href="/main" />
              </div>
              <p className="mt-4 text-sm text-zinc-400">
                à¤†à¤ªà¤•à¥€ à¤–à¤¬à¤°, à¤†à¤ªà¤•à¥€ à¤­à¤¾à¤·à¤¾ à¤®à¥‡à¤‚
              </p>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="w-full md:hidden">
              <motion.section
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="mx-auto w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
              >
                <AuthFormContent
                  errorMessage={errorMessage}
                  isSigningIn={isSigningIn}
                  onGoogleSignIn={handleGoogleSignIn}
                />
              </motion.section>
            </div>

            <div className="hidden w-full md:block lg:hidden">
              <div className="mb-6 flex flex-wrap justify-center gap-2">
                <div className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                  ðŸ“° à¤¤à¤¾à¤œà¤¼à¤¾ à¤–à¤¬à¤°à¥‡à¤‚
                </div>
                <div className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                  ðŸŽ™ï¸ AI à¤¸à¤¾à¤°à¤¾à¤‚à¤¶
                </div>
                <div className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                  ðŸ“„ E-Paper
                </div>
              </div>

              <motion.section
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="mx-auto w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-10 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
              >
                <AuthFormContent
                  errorMessage={errorMessage}
                  isSigningIn={isSigningIn}
                  onGoogleSignIn={handleGoogleSignIn}
                />
              </motion.section>
            </div>
          </div>
        </div>
      </div>

      <div className="relative hidden min-h-screen lg:grid lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative flex flex-col items-center justify-center bg-zinc-950 p-12"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(230,57,70,0.25),transparent_38%)]" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <Logo size="lg" href="/main" />
            <p className="mt-4 text-lg text-zinc-400">
              à¤†à¤ªà¤•à¥€ à¤–à¤¬à¤°, à¤†à¤ªà¤•à¥€ à¤­à¤¾à¤·à¤¾ à¤®à¥‡à¤‚
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <FeaturePill>ðŸ“° à¤¤à¤¾à¤œà¤¼à¤¾ à¤–à¤¬à¤°à¥‡à¤‚ à¤¹à¤° à¤ªà¤²</FeaturePill>
              <FeaturePill>ðŸŽ™ï¸ AI à¤¸à¥‡ à¤–à¤¬à¤° à¤•à¤¾ à¤¸à¤¾à¤°à¤¾à¤‚à¤¶</FeaturePill>
              <FeaturePill>ðŸ“„ à¤¡à¤¿à¤œà¤¿à¤Ÿà¤² E-Paper</FeaturePill>
            </div>
          </div>

          <p className="absolute bottom-8 text-xs text-zinc-600">
            India&apos;s fastest Hindi news platform
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative flex items-center justify-center bg-white p-12 dark:bg-zinc-950"
        >
          <ThemeToggleButton className="absolute top-4 right-4" />

          <div className="mx-auto w-full max-w-sm">
            <AuthFormContent
              errorMessage={errorMessage}
              isSigningIn={isSigningIn}
              onGoogleSignIn={handleGoogleSignIn}
            />
          </div>
        </motion.section>
      </div>
    </main>
  );
}

function SignInPageFallback() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#09090b_0%,#18181b_100%)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(230,57,70,0.2),transparent_32%)]" />

      <div className="relative z-10 mx-auto w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-2xl">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#e63946]" />
        <p className="mt-3 text-sm font-medium text-zinc-300">
          Preparing sign-in...
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInPageFallback />}>
      <SignInPageContent />
    </Suspense>
  );
}
