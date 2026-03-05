'use client';

import Link from 'next/link';
import { Headphones, Loader2, Newspaper, Search, Sparkles } from 'lucide-react';

type AiChatActionChipsProps = {
  language: 'hi' | 'en';
  isWorking: boolean;
  draft: string;
  currentArticleId: string;
  searchRouteHref: string;
  onSearch: () => void;
  onSummary: () => void;
  onListen: () => void;
  onTopHeadlines: () => void;
  isPreparingListen: boolean;
};

function chipBase() {
  return 'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#262626] bg-[#0B0B0B] px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60';
}

export default function AiChatActionChips({
  language,
  isWorking,
  draft,
  currentArticleId,
  searchRouteHref,
  onSearch,
  onSummary,
  onListen,
  onTopHeadlines,
  isPreparingListen,
}: AiChatActionChipsProps) {
  const canSearch = Boolean(draft.trim()) && !isWorking;

  return (
    <div className="border-b border-[#262626] bg-[#151515] px-3 py-2">
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-2">
          <button type="button" onClick={onSearch} disabled={!canSearch} className={chipBase()}>
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{language === 'hi' ? 'Search News' : 'Search News'}</span>
          </button>

          <button
            type="button"
            onClick={onSummary}
            disabled={isWorking || (!currentArticleId && !draft.trim())}
            className={chipBase()}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>TL;DR</span>
          </button>

          <button
            type="button"
            onClick={onListen}
            disabled={isPreparingListen}
            className={chipBase()}
          >
            {isPreparingListen ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>Listen</span>
          </button>

          <button
            type="button"
            onClick={onTopHeadlines}
            disabled={isWorking}
            className={chipBase()}
          >
            <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Top Headlines</span>
          </button>

          <Link
            href={searchRouteHref}
            className="ml-1 text-xs font-semibold text-[#E11D2E] transition hover:text-red-400"
          >
            Full Search
          </Link>
        </div>
      </div>
    </div>
  );
}
