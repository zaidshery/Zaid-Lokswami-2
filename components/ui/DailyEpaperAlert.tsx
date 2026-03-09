'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BellRing, Newspaper, X } from 'lucide-react';
import { useAppStore } from '@/lib/store/appStore';

type LatestPaper = {
  title: string;
  city: string;
  publishDate: string;
};

const DAILY_ALERT_STORAGE_KEY = 'lokswami_daily_epaper_alert_sent_on';

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DailyEpaperAlert() {
  const { language } = useAppStore();
  const [latestPaper, setLatestPaper] = useState<LatestPaper | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [enableState, setEnableState] = useState<'idle' | 'working'>('idle');
  const [notice, setNotice] = useState('');

  const today = useMemo(() => localDateKey(new Date()), []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (typeof window === 'undefined') return;
      const alreadySent = localStorage.getItem(DAILY_ALERT_STORAGE_KEY);
      if (alreadySent === today) return;

      try {
        const response = await fetch('/api/epapers?limit=1&status=published', {
          cache: 'no-store',
        });
        const data = await response.json().catch(() => ({}));
        if (!active) return;

        const first = Array.isArray(data?.data) ? data.data[0] : null;
        if (!response.ok || !first) return;

        const publishDate = String(first.publishDate || '').trim();
        if (publishDate !== today) return;

        const paper: LatestPaper = {
          title: String(first.title || ''),
          city: String(first.cityName || first.citySlug || ''),
          publishDate,
        };
        setLatestPaper(paper);
        setShowBanner(true);
        localStorage.setItem(DAILY_ALERT_STORAGE_KEY, today);

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const body =
            language === 'hi'
              ? `${paper.city} à¤•à¤¾ à¤¨à¤¯à¤¾ à¤ˆ-à¤ªà¥‡à¤ªà¤° à¤† à¤—à¤¯à¤¾ à¤¹à¥ˆà¥¤`
              : `Today's ${paper.city} e-paper is now available.`;
          new Notification(language === 'hi' ? 'à¤†à¤œ à¤•à¤¾ à¤ˆ-à¤ªà¥‡à¤ªà¤° à¤† à¤—à¤¯à¤¾!' : "Today's E-paper has arrived!", {
            body,
            icon: '/logo-icon-final.png',
            tag: `epaper-${today}`,
          });
        }
      } catch {
        // Silent fail: notifications should never block primary browsing.
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [language, today]);

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') {
      return;
    }

    setEnableState('working');
    setNotice('');

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        if (latestPaper) {
          const body =
            language === 'hi'
              ? `${latestPaper.city} à¤•à¤¾ à¤¨à¤¯à¤¾ à¤ˆ-à¤ªà¥‡à¤ªà¤° à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¹à¥ˆà¥¤`
              : `Today's ${latestPaper.city} e-paper is available now.`;
          new Notification(language === 'hi' ? 'à¤…à¤²à¤°à¥à¤Ÿ à¤¸à¤•à¥à¤·à¤® à¤¹à¥‹ à¤—à¤¯à¤¾' : 'Alerts enabled', {
            body,
            icon: '/logo-icon-final.png',
          });
        }

        // If reader is logged in, this keeps their daily-alert preference synced.
        await fetch('/api/auth/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wantsDailyAlerts: true }),
        }).catch(() => undefined);

        setNotice(language === 'hi' ? 'à¤¨à¥‹à¤Ÿà¤¿à¤«à¤¿à¤•à¥‡à¤¶à¤¨ à¤¸à¤•à¥à¤·à¤® à¤¹à¥‹ à¤—à¤¯à¤¾' : 'Browser notifications enabled');
      } else {
        setNotice(language === 'hi' ? 'à¤¨à¥‹à¤Ÿà¤¿à¤«à¤¿à¤•à¥‡à¤¶à¤¨ à¤…à¤¨à¥à¤®à¤¤à¤¿ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€' : 'Notification permission denied');
      }
    } finally {
      setEnableState('idle');
    }
  };

  if (!showBanner || !latestPaper) return null;

  const canEnableBrowserNotifications =
    typeof Notification !== 'undefined' && Notification.permission === 'default';

  return (
    <div className="pointer-events-none fixed bottom-20 right-3 z-[95] w-[min(92vw,24rem)] sm:bottom-6 sm:right-5">
      <div className="pointer-events-auto rounded-2xl border border-zinc-200 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/95">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300">
              <BellRing className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                {language === 'hi' ? 'à¤†à¤œ à¤•à¤¾ à¤ˆ-à¤ªà¥‡à¤ªà¤° à¤† à¤—à¤¯à¤¾!' : "Today's E-paper has arrived!"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                {latestPaper.city}: {latestPaper.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label={language === 'hi' ? 'à¤¬à¤‚à¤¦ à¤•à¤°à¥‡à¤‚' : 'Dismiss'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/main/epaper"
            onClick={() => setShowBanner(false)}
            className="attention-pulsate-bck inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-300 bg-zinc-100 px-3 text-xs font-semibold text-zinc-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-zinc-700 dark:bg-zinc-900/65 dark:text-zinc-100 dark:hover:border-orange-500/50 dark:hover:bg-orange-900/20 dark:hover:text-orange-300"
          >
            <Newspaper className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" />
            {language === 'hi' ? '\u0908-\u092a\u0947\u092a\u0930 \u092a\u0922\u093c\u0947\u0902' : 'Read E-Paper'}
          </Link>

          {canEnableBrowserNotifications ? (
            <button
              type="button"
              onClick={() => void requestNotificationPermission()}
              disabled={enableState === 'working'}
              className="inline-flex h-8 items-center rounded-full border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {enableState === 'working'
                ? language === 'hi'
                  ? 'à¤¸à¤•à¥à¤·à¤® à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆ...'
                  : 'Enabling...'
                : language === 'hi'
                  ? 'à¤…à¤²à¤°à¥à¤Ÿ à¤¸à¤•à¥à¤·à¤® à¤•à¤°à¥‡à¤‚'
                  : 'Enable Alerts'}
            </button>
          ) : null}
        </div>

        {notice ? (
          <p className="mt-2 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">{notice}</p>
        ) : null}
      </div>
    </div>
  );
}

