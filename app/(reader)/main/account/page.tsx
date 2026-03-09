'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, Bookmark, Globe2, Loader2, LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useAppStore } from '@/lib/store/appStore';

const ACCOUNT_REDIRECT_URL = '/signin?redirect=/main/account';
const NOTIFICATION_PREFERENCE_KEY = 'lokswami-reader-notifications';

type BrowserNotificationPermission =
  | NotificationPermission
  | 'unsupported';

function getUserInitials(name: string, email: string) {
  const source = name.trim() || email.trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }

  return (parts[0]?.slice(0, 2) || 'R').toUpperCase();
}

function AccountSkeleton({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl py-3 sm:py-5">
      <div className="cnp-surface overflow-hidden rounded-[28px] p-4 sm:p-6">
        <div className="animate-pulse space-y-6">
          <div className="rounded-[24px] border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-red-50/70 p-5 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-red-950/20">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-6 w-40 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-56 max-w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-6 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="h-5 w-32 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-3 h-4 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-2 h-4 w-4/5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-5 h-10 w-36 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="h-5 w-36 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-4 h-10 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="h-5 w-28 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-4 h-12 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <Loader2 className="h-4 w-4 animate-spin text-red-500" />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}

function PreferenceSwitch({
  checked,
  disabled = false,
  onToggle,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Toggle setting"
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-7 w-12 flex-none items-center rounded-full border transition ${
        checked
          ? 'border-red-500 bg-red-500'
          : 'border-zinc-300 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

/** Renders the signed-in reader profile using the active NextAuth session. */
export default function ReaderAccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { language, setLanguage } = useAppStore();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<BrowserNotificationPermission>('unsupported');
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [notificationNotice, setNotificationNotice] = useState('');

  const copy = useMemo(() => {
    if (language === 'hi') {
      return {
        badge: 'रीडर',
        title: 'रीडर प्रोफ़ाइल',
        subtitle:
          'आपका लोकस्वामी अकाउंट अब Google सत्र से जुड़ा है। यहाँ से अपनी पढ़ने की सेटिंग्स देखें।',
        loading: 'आपकी प्रोफ़ाइल लोड हो रही है...',
        redirecting: 'आपको साइन-इन स्क्रीन पर भेजा जा रहा है...',
        savedArticles: 'सेव्ड आर्टिकल्स',
        savedArticlesHint:
          'अभी कोई सेव्ड आर्टिकल नहीं है। जब आप खबरें सेव करेंगे, वे यहीं दिखाई देंगी।',
        browseStories: 'मुख्य पेज पर जाएँ',
        savedCount: 'सेव्ड',
        preferences: 'रीडिंग सेटिंग्स',
        preferredLanguage: 'पसंदीदा भाषा',
        languageHint: 'लोकस्वामी ब्राउज़ करते समय अपनी पसंद की भाषा चुनें।',
        notifications: 'नोटिफिकेशन',
        notificationsHint:
          'नए ई-पेपर और महत्वपूर्ण अपडेट के लिए ब्राउज़र अलर्ट सक्षम करें।',
        notificationsOn: 'अलर्ट चालू हैं',
        notificationsOff: 'अलर्ट बंद हैं',
        notificationsMuted:
          'अलर्ट लोकस्वामी के लिए बंद कर दिए गए। ब्राउज़र अनुमति अलग से बनी रह सकती है।',
        notificationsDenied:
          'ब्राउज़र ने नोटिफिकेशन अनुमति ब्लॉक कर दी है। सेटिंग्स में अनुमति दें।',
        notificationsUnsupported:
          'इस डिवाइस पर ब्राउज़र नोटिफिकेशन उपलब्ध नहीं हैं।',
        notificationsEnableSuccess: 'ब्राउज़र नोटिफिकेशन सक्षम हो गए।',
        signOut: 'साइन आउट',
        signingOut: 'साइन आउट हो रहा है...',
      };
    }

    return {
      badge: 'Reader',
      title: 'Reader Profile',
      subtitle:
        'Your Lokswami reader account now runs on your Google session. Review your reading settings here.',
      loading: 'Loading your profile...',
      redirecting: 'Redirecting you to sign in...',
      savedArticles: 'Saved Articles',
      savedArticlesHint:
        'You have not saved any stories yet. Once you bookmark articles, they will appear here.',
      browseStories: 'Browse stories',
      savedCount: 'Saved',
      preferences: 'Reading Settings',
      preferredLanguage: 'Preferred Language',
      languageHint: 'Choose the language you want to use while browsing Lokswami.',
      notifications: 'Notifications',
      notificationsHint:
        'Enable browser alerts for fresh e-paper drops and important updates.',
      notificationsOn: 'Alerts enabled',
      notificationsOff: 'Alerts disabled',
      notificationsMuted:
        'Alerts were muted for Lokswami. Browser permission may still remain enabled.',
      notificationsDenied:
        'Browser notifications are blocked. Allow them in your browser settings first.',
      notificationsUnsupported:
        'Browser notifications are not available on this device.',
      notificationsEnableSuccess: 'Browser notifications are enabled.',
      signOut: 'Sign Out',
      signingOut: 'Signing out...',
    };
  }, [language]);

  const userName = session?.user?.name?.trim() || 'Reader';
  const userEmail = session?.user?.email?.trim() || '';
  const userImage = session?.user?.image || null;
  const userInitials = getUserInitials(userName, userEmail);
  const savedArticles = Array.isArray(session?.user?.savedArticles)
    ? session.user.savedArticles
    : [];

  useEffect(() => {
    if (status !== 'unauthenticated') {
      setIsRedirecting(false);
      return;
    }

    setIsRedirecting(true);
    router.replace(ACCOUNT_REDIRECT_URL);
  }, [router, status]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      setNotificationsEnabled(false);
      return;
    }

    const savedPreference = window.localStorage.getItem(
      NOTIFICATION_PREFERENCE_KEY
    );
    const permission = Notification.permission;
    const isEnabled =
      savedPreference === 'enabled' ||
      (savedPreference === null && permission === 'granted');

    setNotificationPermission(permission);
    setNotificationsEnabled(isEnabled && permission === 'granted');
  }, []);

  async function handleNotificationToggle() {
    if (typeof window === 'undefined') {
      return;
    }

    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      setNotificationNotice(copy.notificationsUnsupported);
      return;
    }

    setIsUpdatingNotifications(true);
    setNotificationNotice('');

    try {
      if (notificationsEnabled) {
        window.localStorage.setItem(NOTIFICATION_PREFERENCE_KEY, 'disabled');
        setNotificationsEnabled(false);
        setNotificationPermission(Notification.permission);
        setNotificationNotice(copy.notificationsMuted);
        return;
      }

      if (Notification.permission === 'granted') {
        window.localStorage.setItem(NOTIFICATION_PREFERENCE_KEY, 'enabled');
        setNotificationsEnabled(true);
        setNotificationPermission('granted');
        setNotificationNotice(copy.notificationsEnableSuccess);
        return;
      }

      if (Notification.permission === 'denied') {
        setNotificationPermission('denied');
        setNotificationNotice(copy.notificationsDenied);
        return;
      }

      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        window.localStorage.setItem(NOTIFICATION_PREFERENCE_KEY, 'enabled');
        setNotificationsEnabled(true);
        setNotificationNotice(copy.notificationsEnableSuccess);
        return;
      }

      window.localStorage.setItem(NOTIFICATION_PREFERENCE_KEY, 'disabled');
      setNotificationsEnabled(false);
      setNotificationNotice(copy.notificationsDenied);
    } finally {
      setIsUpdatingNotifications(false);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut({ callbackUrl: '/signin' });
    } catch (error) {
      console.error('Reader sign-out failed:', error);
      setIsSigningOut(false);
    }
  }

  if (status === 'loading' || isRedirecting) {
    return (
      <AccountSkeleton
        message={status === 'loading' ? copy.loading : copy.redirecting}
      />
    );
  }

  if (status !== 'authenticated' || !userEmail) {
    return <AccountSkeleton message={copy.redirecting} />;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="mx-auto w-full max-w-3xl py-3 sm:py-5"
    >
      <div className="cnp-surface overflow-hidden rounded-[28px] p-4 sm:p-6 md:p-7">
        <div className="rounded-[28px] border border-zinc-200 bg-[linear-gradient(135deg,rgba(254,242,242,0.95),rgba(255,255,255,0.98)_45%,rgba(249,250,251,0.98))] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.98),rgba(24,24,27,0.94)_45%,rgba(69,10,10,0.22))] sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-red-100 text-2xl font-black text-red-700 shadow-sm dark:border-zinc-700 dark:bg-red-500/15 dark:text-red-300">
              {userImage ? (
                <Image
                  src={userImage}
                  alt={userName}
                  fill
                  sizes="80px"
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <span>{userInitials}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center rounded-full border border-red-300/70 bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {copy.badge}
              </div>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                {copy.title}
              </p>
              <h1 className="mt-3 truncate text-2xl font-black text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                {userName}
              </h1>
              <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                {userEmail}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {copy.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  {copy.savedArticles}
                </p>
                <h2 className="mt-1 text-xl font-black text-zinc-900 dark:text-zinc-100">
                  {savedArticles.length} {copy.savedCount}
                </h2>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                <Bookmark className="h-5 w-5" />
              </span>
            </div>

            {savedArticles.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/70">
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {copy.savedArticlesHint}
                </p>
                <Link
                  href="/main"
                  className="mt-4 inline-flex items-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400"
                >
                  {copy.browseStories}
                </Link>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {language === 'hi'
                    ? 'आपके सेव्ड आर्टिकल्स प्रोफ़ाइल से जुड़े हुए हैं। विस्तृत सूची अगले चरण में यहीं जोड़ी जाएगी।'
                    : 'Your saved articles are attached to this profile. A full saved-items list can be surfaced here next.'}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    {copy.preferences}
                  </p>
                  <h2 className="mt-1 text-lg font-black text-zinc-900 dark:text-zinc-100">
                    {copy.preferredLanguage}
                  </h2>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  <Globe2 className="h-5 w-5" />
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {copy.languageHint}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-1.5 dark:border-zinc-800 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setLanguage('hi')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    language === 'hi'
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  हिंदी
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    language === 'en'
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    {copy.preferences}
                  </p>
                  <h2 className="mt-1 text-lg font-black text-zinc-900 dark:text-zinc-100">
                    {copy.notifications}
                  </h2>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  <Bell className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-4 flex items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {notificationsEnabled
                      ? copy.notificationsOn
                      : copy.notificationsOff}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {copy.notificationsHint}
                  </p>
                </div>

                <PreferenceSwitch
                  checked={notificationsEnabled}
                  disabled={isUpdatingNotifications}
                  onToggle={() => void handleNotificationToggle()}
                />
              </div>

              {notificationPermission === 'denied' ? (
                <p className="mt-3 text-xs font-semibold text-amber-600 dark:text-amber-300">
                  {copy.notificationsDenied}
                </p>
              ) : null}

              {notificationPermission === 'unsupported' ? (
                <p className="mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {copy.notificationsUnsupported}
                </p>
              ) : null}

              {notificationNotice ? (
                <p className="mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-300">
                  {notificationNotice}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={isSigningOut}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span>{isSigningOut ? copy.signingOut : copy.signOut}</span>
        </button>
      </div>
    </motion.section>
  );
}
