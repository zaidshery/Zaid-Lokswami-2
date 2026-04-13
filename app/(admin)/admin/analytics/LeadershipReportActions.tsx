'use client';

import { useState } from 'react';

export default function LeadershipReportActions({
  viewHref,
  downloadHref,
}: {
  viewHref: string;
  downloadHref: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopyView() {
    try {
      const absoluteUrl =
        typeof window !== 'undefined' ? new URL(viewHref, window.location.origin).toString() : viewHref;
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error('Failed to copy leadership report link.', error);
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={downloadHref}
        className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
      >
        Download Briefing
      </a>
      <button
        type="button"
        onClick={handleCopyView}
        className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {copied ? 'View Link Copied' : 'Copy View Link'}
      </button>
      <a
        href={viewHref}
        className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Open View
      </a>
    </div>
  );
}
