'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, Share2, Smartphone, X } from 'lucide-react';
import { useAppStore } from '@/lib/store/appStore';

const INSTALL_PROMPT_STORAGE_KEY = 'lokswami_install_prompt_state_v1';
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

type InstallPromptState = {
  dismissedAt?: number;
  acceptedAt?: number;
};

function readInstallPromptState(): InstallPromptState {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(INSTALL_PROMPT_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as InstallPromptState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveInstallPromptState(next: InstallPromptState) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(INSTALL_PROMPT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore localStorage failures.
  }
}

function isStandaloneMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true ||
    document.referrer.startsWith('android-app://')
  );
}

function isIosSafari() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent;
  const isIosDevice =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafariBrowser =
    /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);

  return isIosDevice && isSafariBrowser;
}

function canShowPromptAgain() {
  const state = readInstallPromptState();

  if (state.acceptedAt) {
    return false;
  }

  if (!state.dismissedAt) {
    return true;
  }

  return Date.now() - state.dismissedAt >= DISMISS_COOLDOWN_MS;
}

function isEligiblePath(pathname: string | null) {
  if (!pathname) {
    return false;
  }

  return !(
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signin')
  );
}

export default function InstallAppPrompt() {
  const pathname = usePathname();
  const { language } = useAppStore();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [notice, setNotice] = useState('');
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  const eligiblePath = isEligiblePath(pathname);
  const isReaderRoute = pathname?.startsWith('/main') ?? false;

  const copy = useMemo(
    () =>
      language === 'hi'
        ? {
            badge: 'ऐप इंस्टॉल',
            title: 'लोकस्वामी ऐप होम स्क्रीन पर जोड़ें',
            subtitle: 'तेज खुलने वाला अनुभव, फुल स्क्रीन पढ़ाई और आसान वापसी।',
            install: 'अभी इंस्टॉल करें',
            installing: 'इंस्टॉल हो रहा है...',
            dismiss: 'अभी नहीं',
            iosTitle: 'iPhone पर ऐप की तरह सेव करें',
            iosSubtitle: 'Safari में Share दबाएं, फिर Add to Home Screen चुनें।',
            unavailable: 'अभी इंस्टॉल प्रॉम्प्ट उपलब्ध नहीं है। पेज एक बार रिफ्रेश करके फिर कोशिश करें।',
          }
        : {
            badge: 'Install App',
            title: 'Add Lokswami to your home screen',
            subtitle: 'Launch faster, read full-screen, and come back in one tap.',
            install: 'Install now',
            installing: 'Opening install prompt...',
            dismiss: 'Not now',
            iosTitle: 'Save it like an app on iPhone',
            iosSubtitle: 'In Safari, tap Share and then choose Add to Home Screen.',
            unavailable: 'The install prompt is not ready yet. Refresh once and try again.',
          },
    [language]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Silent failure keeps the UI usable even if service worker registration fails.
    });
  }, []);

  useEffect(() => {
    if (!eligiblePath || isStandaloneMode()) {
      setIsVisible(false);
      setShowIosInstructions(false);
      return;
    }

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowIosInstructions(false);
      setNotice('');

      if (canShowPromptAgain()) {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      saveInstallPromptState({
        ...readInstallPromptState(),
        acceptedAt: Date.now(),
      });
      setDeferredPrompt(null);
      setShowIosInstructions(false);
      setIsVisible(false);
      setNotice('');
    };

    let iosTimer: number | null = null;

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (isIosSafari() && canShowPromptAgain()) {
      iosTimer = window.setTimeout(() => {
        if (!isStandaloneMode()) {
          setDeferredPrompt(null);
          setShowIosInstructions(true);
          setNotice('');
          setIsVisible(true);
        }
      }, 4000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);

      if (iosTimer) {
        window.clearTimeout(iosTimer);
      }
    };
  }, [eligiblePath, pathname]);

  const dismissPrompt = () => {
    saveInstallPromptState({
      ...readInstallPromptState(),
      dismissedAt: Date.now(),
    });
    setIsVisible(false);
    setNotice('');
  };

  const installApp = async () => {
    if (!deferredPrompt) {
      setNotice(copy.unavailable);
      return;
    }

    setIsInstalling(true);
    setNotice('');

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        saveInstallPromptState({
          ...readInstallPromptState(),
          acceptedAt: Date.now(),
        });
      } else {
        saveInstallPromptState({
          ...readInstallPromptState(),
          dismissedAt: Date.now(),
        });
      }

      setDeferredPrompt(null);
      setIsVisible(false);
    } catch {
      setNotice(copy.unavailable);
    } finally {
      setIsInstalling(false);
    }
  };

  if (!eligiblePath || !isVisible || isStandaloneMode()) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none fixed inset-x-3 z-[115] ${
        isReaderRoute
          ? 'bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.75rem)] sm:bottom-4'
          : 'bottom-4'
      }`}
    >
      <section className="pointer-events-auto mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 shadow-2xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
        <div className="bg-gradient-to-r from-primary-600 via-red-600 to-orange-500 px-4 py-3 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
                <Smartphone className="h-3.5 w-3.5" />
                {copy.badge}
              </div>
              <h2 className="mt-2 text-base font-black leading-tight sm:text-lg">
                {showIosInstructions ? copy.iosTitle : copy.title}
              </h2>
              <p className="mt-1 text-sm text-white/85">
                {showIosInstructions ? copy.iosSubtitle : copy.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={dismissPrompt}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          {showIosInstructions ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200">
              <p className="flex items-center gap-2 font-semibold">
                <Share2 className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                {copy.iosSubtitle}
              </p>
            </div>
          ) : null}

          {notice ? (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/12 dark:text-amber-100">
              {notice}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {!showIosInstructions ? (
              <button
                type="button"
                onClick={() => void installApp()}
                disabled={isInstalling}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {isInstalling ? copy.installing : copy.install}
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismissPrompt}
              className="inline-flex h-10 items-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {copy.dismiss}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
