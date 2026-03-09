import Link from 'next/link';

/** Renders the signed-in reader preferences screen. */
export default function PreferencesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl py-4 sm:py-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
          Reader Area
        </p>
        <h1 className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-100">
          Preferences
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          This protected page is ready for language, category, and notification
          settings backed by your reader profile.
        </p>
        <Link
          href="/main"
          className="mt-6 inline-flex rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
