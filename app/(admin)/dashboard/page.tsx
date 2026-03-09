import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAdminRole } from '@/lib/auth/roles';

/** Example server-protected page for admin-only NextAuth access. */
export default async function DashboardPage() {
  const session = await auth();

  if (
    !session?.user?.email ||
    !isAdminRole(session.user.role) ||
    session.user.isActive === false
  ) {
    redirect('/signin?redirect=/admin');
  }

  return (
    <div className="mx-auto w-full max-w-4xl py-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
          Protected Example
        </p>
        <h1 className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-100">
          Admin Dashboard
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          This page is protected on the server with the current NextAuth admin
          session.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Name
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {session.user.name || 'Admin'}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Email
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {session.user.email}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="inline-flex rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            Open Admin Panel
          </Link>
          <Link
            href="/main"
            className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Back to Main Site
          </Link>
        </div>
      </div>
    </div>
  );
}
