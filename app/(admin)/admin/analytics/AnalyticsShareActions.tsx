'use client';

import { useState } from 'react';

export default function AnalyticsShareActions({
  shareHref,
  exportHref,
}: {
  shareHref: string;
  exportHref: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopyLink() {
    try {
      const absoluteUrl =
        typeof window !== 'undefined' ? new URL(shareHref, window.location.origin).toString() : shareHref;
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error('Failed to copy analytics share link.', error);
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={exportHref}
        className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
      >
        Download CSV
      </a>
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {copied ? 'Link Copied' : 'Copy Report Link'}
      </button>
      <a
        href={shareHref}
        className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Open Current View
      </a>
    </div>
  );
}
