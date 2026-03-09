'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, LogIn, LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

interface AuthButtonProps {
  className?: string;
  loginHref?: string;
  redirectTo?: string;
  showEmail?: boolean;
}

/** Reusable auth control for admin-facing UI surfaces. */
export default function AuthButton({
  className = '',
  loginHref = '/login',
  redirectTo = '/login',
  showEmail = true,
}: AuthButtonProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isBusy, setIsBusy] = useState(false);

  const userName =
    session?.user?.name?.trim() ||
    session?.user?.email?.split('@')[0]?.trim() ||
    'Admin';
  const userEmail = session?.user?.email?.trim() || '';

  async function handleLogout() {
    setIsBusy(true);

    try {
      try {
        await signOut({ redirect: false });
      } catch {
        // Ignore client-side sign-out errors and still navigate to login.
      }

      router.push(redirectTo);
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  if (status === 'loading' || isBusy) {
    return (
      <div
        className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{isBusy ? 'Signing out...' : 'Loading session...'}</span>
      </div>
    );
  }

  if (!userEmail) {
    return (
      <Link
        href={loginHref}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 ${className}`}
      >
        <LogIn className="h-4 w-4" />
        <span>Login</span>
      </Link>
    );
  }

  return (
    <div
      className={`flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900 ${className}`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {userName}
        </p>
        {showEmail ? (
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {userEmail}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => void handleLogout()}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <LogOut className="h-4 w-4" />
        <span>Logout</span>
      </button>
    </div>
  );
}
