'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole } from 'lucide-react';
import Logo from '@/components/layout/Logo';

type SetupProfile = {
  name: string;
  email: string;
  loginId: string;
  role: string;
  setupExpiresAt: string | null;
};

function SetupAdminAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [profile, setProfile] = useState<SetupProfile | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const setupExpiryLabel = useMemo(() => {
    if (!profile?.setupExpiresAt) {
      return '';
    }

    const date = new Date(profile.setupExpiresAt);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString();
  }, [profile?.setupExpiresAt]);

  useEffect(() => {
    if (!token.trim()) {
      setError('Setup link is missing or invalid.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/auth/staff-setup?token=${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || 'Invalid setup link');
        }

        if (!cancelled) {
          setProfile(payload.data as SetupProfile);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Invalid setup link');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit() {
    if (!token.trim()) {
      setError('Setup link is missing or invalid.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/staff-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to set password');
      }

      setSuccess('Password set successfully. You can now sign in with your login ID or email.');
      setPassword('');
      setConfirmPassword('');

      window.setTimeout(() => {
        router.push('/signin?redirect=/admin');
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#09090b_0%,#18181b_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(230,57,70,0.2),transparent_32%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/95 p-8 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.8)] dark:bg-zinc-950/92">
          <div className="flex justify-center">
            <Logo size="lg" href="/main" />
          </div>

          <div className="mt-6 text-center">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-3xl font-black text-zinc-900 dark:text-zinc-100">
              Set Staff Password
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Finish your Lokswami staff account setup and create a password for admin access.
            </p>
          </div>

          {loading ? (
            <div className="mt-8 flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-red-500" />
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              {error ? (
                <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              {success ? (
                <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              ) : null}

              {profile ? (
                <div className="rounded-[24px] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    Staff Account
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
                    <p>
                      <span className="font-semibold">Name:</span> {profile.name || 'Team Member'}
                    </p>
                    <p>
                      <span className="font-semibold">Email:</span> {profile.email}
                    </p>
                    <p>
                      <span className="font-semibold">Login ID:</span> {profile.loginId || profile.email}
                    </p>
                    <p>
                      <span className="font-semibold">Role:</span> {profile.role}
                    </p>
                    {setupExpiryLabel ? (
                      <p>
                        <span className="font-semibold">Link expires:</span> {setupExpiryLabel}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {profile ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      New Password
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      className="h-12 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      placeholder="Enter a strong password"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Confirm Password
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      className="h-12 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      placeholder="Confirm your password"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={submitting}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    <span>{submitting ? 'Saving password...' : 'Complete Setup'}</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50/75 p-5 text-sm leading-6 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
                  Ask a super admin to generate a fresh setup link from the Team page.
                </div>
              )}

              <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                Already configured?{' '}
                <Link href="/signin?redirect=/admin" className="font-semibold text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300">
                  Go to sign in
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function SetupAdminAccountFallback() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#09090b_0%,#18181b_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(230,57,70,0.2),transparent_32%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/95 p-8 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.8)] dark:bg-zinc-950/92">
          <div className="flex justify-center">
            <Logo size="lg" href="/main" />
          </div>
          <div className="mt-8 flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-red-500" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SetupAdminAccountPage() {
  return (
    <Suspense fallback={<SetupAdminAccountFallback />}>
      <SetupAdminAccountContent />
    </Suspense>
  );
}
