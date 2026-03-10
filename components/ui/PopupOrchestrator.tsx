'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BellRing, MapPin, Sparkles, X } from 'lucide-react';
import { useAppStore } from '@/lib/store/appStore';
import {
  activatePopup,
  dismissPopup,
  getNextPopup,
  neverShowPopupAgain,
  readPopupState,
  registerPathVisit,
  resolveNotificationPermission,
  savePreferredCategories,
  saveSelectedState,
  type PopupType,
} from '@/lib/popups/popupManager';

const STATE_OPTIONS = [
  'उत्तर प्रदेश',
  'बिहार',
  'मध्य प्रदेश',
  'राजस्थान',
  'दिल्ली',
  'हरियाणा',
  'उत्तराखंड',
  'झारखंड',
];

const PERSONALIZATION_TOPICS = [
  { value: 'national', labelHi: 'राष्ट्रीय', labelEn: 'National' },
  { value: 'regional', labelHi: 'रीजनल', labelEn: 'Regional' },
  { value: 'politics', labelHi: 'राजनीति', labelEn: 'Politics' },
  { value: 'business', labelHi: 'बिजनेस', labelEn: 'Business' },
  { value: 'sports', labelHi: 'खेल', labelEn: 'Sports' },
  { value: 'technology', labelHi: 'टेक', labelEn: 'Tech' },
  { value: 'entertainment', labelHi: 'मनोरंजन', labelEn: 'Entertainment' },
];

type PopupSnapshot = ReturnType<typeof readPopupState>;

function PopupFrame({
  title,
  subtitle,
  onDismiss,
  onNeverShow,
  children,
}: {
  title: string;
  subtitle: string;
  onDismiss: () => void;
  onNeverShow: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-3 sm:items-center sm:p-5">
      <section className="pointer-events-auto w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:p-5">
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
              {title}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Dismiss popup"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {children}

        <footer className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-10 items-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            अभी नहीं
          </button>
          <button
            type="button"
            onClick={onNeverShow}
            className="inline-flex h-10 items-center rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/45 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/20"
          >
            फिर न दिखाएं
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function PopupOrchestrator() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { language } = useAppStore();
  const [snapshot, setSnapshot] = useState<PopupSnapshot>(() => readPopupState());
  const [activePopup, setActivePopup] = useState<PopupType | null>(null);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationNotice, setNotificationNotice] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const isAuthenticated =
    status === 'authenticated' && Boolean(session?.user?.email);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const next = registerPathVisit(pathname);
    setSnapshot(next);
  }, [pathname]);

  useEffect(() => {
    if (!pathname || activePopup) {
      return;
    }

    const nextPopup = getNextPopup({
      isAuthenticated,
      notificationPermission: resolveNotificationPermission(),
    });

    if (!nextPopup) {
      return;
    }

    const nextState = activatePopup(nextPopup);
    setSnapshot(nextState);
    setActivePopup(nextPopup);

    if (nextPopup === 'personalization') {
      setSelectedTopics(nextState.preferredCategories);
    }
  }, [activePopup, isAuthenticated, pathname]);

  const onDismiss = () => {
    if (!activePopup) {
      return;
    }

    const next = dismissPopup(activePopup);
    setSnapshot(next);
    setActivePopup(null);
    setNotificationNotice('');
  };

  const onNeverShow = () => {
    if (!activePopup) {
      return;
    }

    const next = neverShowPopupAgain(activePopup);
    setSnapshot(next);
    setActivePopup(null);
    setNotificationNotice('');
  };

  const stateSubtitle = useMemo(
    () =>
      language === 'hi'
        ? 'अपना राज्य चुनें ताकि आपके लिए स्थानीय खबरें बेहतर हों।'
        : 'Choose your state for better local news recommendations.',
    [language]
  );

  const notificationSubtitle = useMemo(
    () =>
      language === 'hi'
        ? 'ब्रेकिंग और ई-पेपर अलर्ट पाने के लिए नोटिफिकेशन अनुमति दें।'
        : 'Allow browser notifications for breaking and e-paper alerts.',
    [language]
  );

  const personalizationSubtitle = useMemo(
    () =>
      language === 'hi'
        ? 'अपने पसंदीदा टॉपिक चुनें, हम न्यूज़ फीड को आपके लिए बेहतर करेंगे।'
        : 'Pick preferred topics to personalize your news feed.',
    [language]
  );

  const toggleTopic = (value: string) => {
    setSelectedTopics((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const onSaveTopics = () => {
    const next = savePreferredCategories(selectedTopics);
    setSnapshot(next);
    setActivePopup(null);
  };

  const onEnableNotifications = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationNotice(
        language === 'hi'
          ? 'इस ब्राउज़र में नोटिफिकेशन उपलब्ध नहीं हैं।'
          : 'Notifications are not supported in this browser.'
      );
      return;
    }

    setNotificationBusy(true);
    setNotificationNotice('');

    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        setNotificationNotice(
          language === 'hi'
            ? 'नोटिफिकेशन सक्षम हो गए।'
            : 'Notifications are enabled.'
        );
      } else if (permission === 'denied') {
        setNotificationNotice(
          language === 'hi'
            ? 'नोटिफिकेशन अनुमति अस्वीकार की गई।'
            : 'Notification permission was denied.'
        );
      } else {
        setNotificationNotice(
          language === 'hi'
            ? 'आप बाद में भी अनुमति दे सकते हैं।'
            : 'You can enable notifications later.'
        );
      }

      const next = dismissPopup('notification');
      setSnapshot(next);
      setActivePopup(null);
    } finally {
      setNotificationBusy(false);
    }
  };

  const onSelectState = (value: string) => {
    const next = saveSelectedState(value);
    setSnapshot(next);
    setActivePopup(null);
  };

  if (!activePopup) {
    return null;
  }

  if (activePopup === 'state') {
    return (
      <PopupFrame
        title="आपका राज्य चुनें"
        subtitle={stateSubtitle}
        onDismiss={onDismiss}
        onNeverShow={onNeverShow}
      >
        <div className="grid grid-cols-2 gap-2.5">
          {STATE_OPTIONS.map((stateName) => {
            const isSelected = snapshot.selectedState === stateName;

            return (
              <button
                key={stateName}
                type="button"
                onClick={() => onSelectState(stateName)}
                className={`inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-500/15 dark:text-primary-200'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-600'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>{stateName}</span>
              </button>
            );
          })}
        </div>
      </PopupFrame>
    );
  }

  if (activePopup === 'notification') {
    return (
      <PopupFrame
        title={language === 'hi' ? 'नोटिफिकेशन अलर्ट चालू करें' : 'Enable Notifications'}
        subtitle={notificationSubtitle}
        onDismiss={onDismiss}
        onNeverShow={onNeverShow}
      >
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200">
          <p className="flex items-center gap-2 font-semibold">
            <BellRing className="h-4 w-4 text-red-500" />
            {language === 'hi'
              ? 'ब्रेकिंग न्यूज़ और ई-पेपर अपडेट मिस न करें।'
              : 'Do not miss breaking updates and e-paper alerts.'}
          </p>
          {notificationNotice ? (
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
              {notificationNotice}
            </p>
          ) : null}
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => void onEnableNotifications()}
            disabled={notificationBusy}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <BellRing className="h-4 w-4" />
            {notificationBusy
              ? language === 'hi'
                ? 'प्रोसेस हो रहा है...'
                : 'Processing...'
              : language === 'hi'
                ? 'नोटिफिकेशन अनुमति दें'
                : 'Allow notifications'}
          </button>
        </div>
      </PopupFrame>
    );
  }

  return (
    <PopupFrame
      title={language === 'hi' ? 'अपना फीड पर्सनलाइज़ करें' : 'Personalize Your Feed'}
      subtitle={personalizationSubtitle}
      onDismiss={onDismiss}
      onNeverShow={onNeverShow}
    >
      <div className="flex flex-wrap gap-2">
        {PERSONALIZATION_TOPICS.map((topic) => {
          const selected = selectedTopics.includes(topic.value);
          return (
            <button
              key={topic.value}
              type="button"
              onClick={() => toggleTopic(topic.value)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selected
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-500/20 dark:text-primary-200'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-600'
              }`}
            >
              <Sparkles className="h-3 w-3" />
              {language === 'hi' ? topic.labelHi : topic.labelEn}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={onSaveTopics}
          disabled={selectedTopics.length === 0}
          className="inline-flex h-10 items-center rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {language === 'hi' ? 'पसंद सहेजें' : 'Save preferences'}
        </button>
      </div>
    </PopupFrame>
  );
}

