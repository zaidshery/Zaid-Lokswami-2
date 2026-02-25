'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import { useAppStore } from '@/lib/store/appStore';
import Container from '../common/Container';
import type { BreakingNews as BreakingNewsType } from '@/lib/mock/data';

interface BreakingNewsProps {
  news: BreakingNewsType[];
}

export default function BreakingNews({ news }: BreakingNewsProps) {
  const { language } = useAppStore();
  const [isPaused, setIsPaused] = useState(false);

  if (news.length === 0) return null;

  const tickerItems = [...news, ...news];

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] w-full border-b border-red-700/40 bg-red-600 shadow-[var(--shadow-soft)] dark:border-red-800/60 dark:bg-red-700">
      <Container>
        <div className="flex h-10 items-center gap-3 overflow-hidden md:h-10">
          <div className="flex flex-shrink-0 items-center pr-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-2.5 py-0.5 shadow-sm ring-1 ring-red-300/70">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.15)]" />
              <span className="text-[11px] font-extrabold tracking-[0.04em] text-red-500">
                {language === 'hi' ? '\u0932\u093e\u0907\u0935' : 'LIVE'}
              </span>
            </span>
          </div>

          <div
            className="relative flex-1 overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            aria-label={language === 'hi' ? '\u0924\u093e\u091c\u093c\u093e \u0916\u092c\u0930\u0947\u0902' : 'Breaking news ticker'}
          >
            <div
              className="flex items-center gap-6 whitespace-nowrap text-xs md:text-sm"
              style={{
                animationName: 'marquee',
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationDuration: '22s',
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
              role="list"
              aria-live="polite"
            >
              {tickerItems.map((item, index) => (
                <Link
                  key={`${item.id}-${index}`}
                  href={`/main/article/${encodeURIComponent(item.id)}`}
                  className="cnp-motion group flex items-center gap-1.5 rounded-md px-2 py-0.5 hover:bg-white/12"
                >
                  <Zap className="h-2.5 w-2.5 flex-shrink-0 text-white/90 group-hover:text-white" />
                  <span className="font-medium text-white/95 group-hover:text-white">{item.title}</span>
                </Link>
              ))}
            </div>

            <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-7 bg-gradient-to-r from-red-600 to-transparent dark:from-red-700" />
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l from-red-600 via-red-600/70 to-transparent dark:from-red-700" />
          </div>
        </div>
      </Container>
    </div>
  );
}
