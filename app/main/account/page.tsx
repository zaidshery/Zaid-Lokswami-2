'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCircle2, Loader2, LogIn, LogOut, Mail, Shield, User } from 'lucide-react';
import { trackClientEvent } from '@/lib/analytics/trackClient';
import { useAppStore } from '@/lib/store/appStore';

type ReaderSession = {
  id: string;
  name: string;
  email: string;
  wantsDailyAlerts: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const OIDC_ENABLED = process.env.NEXT_PUBLIC_OIDC_ENABLED === 'true';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsId = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?:
        | 'signin_with'
        | 'signup_with'
        | 'continue_with'
        | 'signin';
      shape?: 'pill' | 'rectangular' | 'circle' | 'square';
      width?: number;
    }
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

export default function ReaderAccountPage() {
  const { language } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<ReaderSession | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [wantsDailyAlerts, setWantsDailyAlerts] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const t = useMemo(() => {
    if (language === 'hi') {
      return {
        heading: '\u0930\u0940\u0921\u0930 \u0905\u0915\u093e\u0909\u0902\u091f',
        subHeading:
          '\u0932\u0949\u0917\u093f\u0928/\u0930\u091c\u093f\u0938\u094d\u091f\u0930 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0908-\u092a\u0947\u092a\u0930 \u0905\u0932\u0930\u094d\u091f\u094d\u0938 \u092e\u0948\u0928\u0947\u091c \u0915\u0930\u0947\u0902',
        login: '\u0932\u0949\u0917\u093f\u0928',
        register: '\u0930\u091c\u093f\u0938\u094d\u091f\u0930',
        fullName: '\u092a\u0942\u0930\u093e \u0928\u093e\u092e',
        email: '\u0908\u092e\u0947\u0932',
        password: '\u092a\u093e\u0938\u0935\u0930\u094d\u0921',
        confirmPassword: '\u092a\u093e\u0938\u0935\u0930\u094d\u0921 \u092a\u0941\u0937\u094d\u091f\u093f',
        dailyAlerts: '\u0926\u0948\u0928\u093f\u0915 \u0908-\u092a\u0947\u092a\u0930 \u0905\u0932\u0930\u094d\u091f\u094d\u0938',
        submitLogin: '\u0932\u0949\u0917\u093f\u0928 \u0915\u0930\u0947\u0902',
        submitRegister: '\u0905\u0915\u093e\u0909\u0902\u091f \u092c\u0928\u093e\u090f\u0902',
        loggingOut: '\u0932\u0949\u0917\u0906\u0909\u091f',
        logout: '\u0932\u0949\u0917\u0906\u0909\u091f',
        accountTitle: '\u0906\u092a \u0932\u0949\u0917\u093f\u0928 \u0939\u0948\u0902',
        accountHint:
          '\u0928\u094b\u091f\u093f\u092b\u093f\u0915\u0947\u0936\u0928/\u0938\u092c\u094d\u0938\u0915\u094d\u0930\u093f\u092a\u094d\u0936\u0928 \u0915\u0947 \u0932\u093f\u090f \u092f\u0939 \u0905\u0915\u093e\u0909\u0902\u091f \u092d\u0935\u093f\u0937\u094d\u092f \u0915\u0947 \u092b\u0940\u091a\u0930\u094d\u0938 \u0938\u0947 \u091c\u0941\u0921\u093c\u093e \u0930\u0939\u0947\u0917\u093e\u0964',
        savePreference: '\u0938\u0947\u0935 \u0915\u0930\u0947\u0902',
        openEpaper: '\u0908-\u092a\u0947\u092a\u0930 \u0916\u094b\u0932\u0947\u0902',
        secure: '\u0938\u093f\u0915\u094d\u092f\u094b\u0930 \u0932\u0949\u0917\u093f\u0928',
        google: 'Google \u0938\u0947 \u091c\u093e\u0930\u0940 \u0930\u0916\u0947\u0902',
        oidc: 'SSO \u0938\u0947 \u091c\u093e\u0930\u0940 \u0930\u0916\u0947\u0902',
        googleUnavailable:
          'Google sign-in \u0915\u0947 \u0932\u093f\u090f NEXT_PUBLIC_GOOGLE_CLIENT_ID \u0938\u0947\u091f \u0915\u0930\u0947\u0902\u0964',
        oidcUnavailable:
          'SSO \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 NEXT_PUBLIC_OIDC_ENABLED \u091a\u0947\u0915 \u0915\u0930\u0947\u0902\u0964',
        orContinueWithEmail: '\u092f\u093e \u0908\u092e\u0947\u0932 \u0915\u0947 \u0938\u093e\u0925 \u091c\u093e\u0930\u0940 \u0930\u0916\u0947\u0902',
        googleFailed: 'Google \u0932\u0949\u0917\u093f\u0928 \u0905\u0938\u092b\u0932',
      };
    }

    return {
      heading: 'Reader Account',
      subHeading: 'Login/register and manage your e-paper alerts',
      login: 'Login',
      register: 'Register',
      fullName: 'Full Name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      dailyAlerts: 'Daily e-paper alerts',
      submitLogin: 'Sign In',
      submitRegister: 'Create Account',
      loggingOut: 'Logging out',
      logout: 'Logout',
      accountTitle: 'You are signed in',
      accountHint: 'This account is ready for upcoming e-paper subscriber features.',
      savePreference: 'Save',
      openEpaper: 'Open E-Paper',
      secure: 'Secure login',
      google: 'Continue with Google',
      oidc: 'Continue with SSO',
      googleUnavailable: 'Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in.',
      oidcUnavailable: 'SSO is currently unavailable. Enable NEXT_PUBLIC_OIDC_ENABLED.',
      orContinueWithEmail: 'Or continue with email',
      googleFailed: 'Google login failed',
    };
  }, [language]);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      setIsCheckingSession(true);
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));

        if (!active) return;
        if (response.ok && data?.success && data?.user) {
          setUser(data.user as ReaderSession);
          setEmail(String(data.user.email || ''));
        } else {
          setUser(null);
        }
      } catch {
        if (!active) return;
        setUser(null);
      } finally {
        if (active) {
          setIsCheckingSession(false);
        }
      }
    };

    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('authSuccess');
    const authError = params.get('authError');

    if (authSuccess === 'oidc') {
      setSuccess(
        language === 'hi'
          ? 'SSO लॉगिन सफल'
          : 'SSO login successful'
      );
      setError('');
      trackClientEvent({
        event: 'reader_auth_success',
        page: '/main/account',
        source: 'reader_auth',
        metadata: { method: 'oidc' },
      });
    }

    if (authError) {
      setError(
        language === 'hi'
          ? 'SSO लॉगिन असफल रहा। कृपया पुनः प्रयास करें।'
          : 'SSO login failed. Please try again.'
      );
      setSuccess('');
      trackClientEvent({
        event: 'reader_auth_fail',
        page: '/main/account',
        source: 'reader_auth',
        metadata: { method: 'oidc', reason: authError },
      });
    }

    if (authSuccess || authError) {
      params.delete('authSuccess');
      params.delete('authError');
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, [language]);

  useEffect(() => {
    if (user || !GOOGLE_CLIENT_ID) {
      setIsGoogleReady(false);
      return;
    }

    let active = true;

    const initializeGoogleButton = () => {
      if (!active) return;
      const googleId = window.google?.accounts?.id;
      const mountNode = googleButtonRef.current;
      if (!googleId || !mountNode) return;

      mountNode.innerHTML = '';
      googleId.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: GoogleCredentialResponse) => {
          void handleGoogleCredential(response?.credential);
        },
        ux_mode: 'popup',
      });
      googleId.renderButton(mountNode, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: Math.max(240, mountNode.clientWidth || 320),
      });
      setIsGoogleReady(true);
    };

    const existingScript = document.getElementById('google-identity-service') as HTMLScriptElement | null;
    if (existingScript) {
      if (window.google?.accounts?.id) {
        initializeGoogleButton();
      } else {
        existingScript.onload = () => initializeGoogleButton();
      }
    } else {
      const script = document.createElement('script');
      script.id = 'google-identity-service';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initializeGoogleButton();
      script.onerror = () => {
        if (active) setIsGoogleReady(false);
      };
      document.head.appendChild(script);
    }

    return () => {
      active = false;
    };
    // Google identity script is initialized once per session; callback capture is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, wantsDailyAlerts, language]);

  const resetNotices = () => {
    setError('');
    setSuccess('');
  };

  const handleGoogleCredential = async (credential?: string) => {
    resetNotices();

    if (!credential) {
      setError(t.googleFailed);
      trackClientEvent({
        event: 'reader_auth_fail',
        page: '/main/account',
        source: 'reader_auth',
        metadata: { method: 'google', reason: 'missing_credential' },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: credential,
          wantsDailyAlerts,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success || !data?.user) {
        setError(String(data?.error || t.googleFailed));
        trackClientEvent({
          event: 'reader_auth_fail',
          page: '/main/account',
          source: 'reader_auth',
          metadata: { method: 'google', reason: 'api_error' },
        });
        return;
      }

      setUser(data.user as ReaderSession);
      setEmail(String(data.user.email || ''));
      setPassword('');
      setConfirmPassword('');
      setSuccess(language === 'hi' ? '\u0932\u0949\u0917\u093f\u0928 \u0938\u092b\u0932' : 'Signed in successfully');
      trackClientEvent({
        event: 'reader_auth_success',
        page: '/main/account',
        source: 'reader_auth',
        metadata: { method: 'google' },
      });
    } catch {
      setError(language === 'hi' ? '\u0928\u0947\u091f\u0935\u0930\u094d\u0915 \u0924\u094d\u0930\u0941\u091f\u093f' : 'Network error. Please try again.');
      trackClientEvent({
        event: 'reader_auth_fail',
        page: '/main/account',
        source: 'reader_auth',
        metadata: { method: 'google', reason: 'network_error' },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    resetNotices();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password;

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError(language === 'hi' ? '\u0915\u0943\u092a\u092f\u093e \u0938\u0939\u0940 \u0908\u092e\u0947\u0932 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902' : 'Please enter a valid email');
      return;
    }
    if (!normalizedPassword) {
      setError(language === 'hi' ? '\u092a\u093e\u0938\u0935\u0930\u094d\u0921 \u0906\u0935\u0936\u094d\u092f\u0915 \u0939\u0948' : 'Password is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password: normalizedPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success || !data?.user) {
        setError(String(data?.error || (language === 'hi' ? '\u0932\u0949\u0917\u093f\u0928 \u0905\u0938\u092b\u0932' : 'Login failed')));
        trackClientEvent({
          event: 'reader_auth_fail',
          page: '/main/account',
          source: 'reader_auth',
          metadata: { method: 'password_login', reason: 'api_error' },
        });
        return;
      }

      setUser(data.user as ReaderSession);
      setEmail(String(data.user.email || ''));
      setPassword('');
      setSuccess(language === 'hi' ? '\u0932\u0949\u0917\u093f\u0928 \u0938\u092b\u0932' : 'Signed in successfully');
      trackClientEvent({
        event: 'reader_auth_success',
        page: '/main/account',
        source: 'reader_auth',
        metadata: { method: 'password_login' },
      });
    } catch {
      setError(language === 'hi' ? '\u0928\u0947\u091f\u0935\u0930\u094d\u0915 \u0924\u094d\u0930\u0941\u091f\u093f' : 'Network error. Please try again.');
      trackClientEvent({
        event: 'reader_auth_fail',
        page: '/main/account',
        source: 'reader_auth',
        metadata: { method: 'password_login', reason: 'network_error' },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    resetNotices();

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password;

    if (normalizedName.length < 2) {
      setError(language === 'hi' ? '\u0928\u093e\u092e \u0915\u092e \u0938\u0947 \u0915\u092e 2 \u0905\u0915\u094d\u0937\u0930 \u0915\u093e \u0939\u094b\u0928\u093e \u091a\u093e\u0939\u093f\u090f' : 'Name must be at least 2 characters');
      return;
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError(language === 'hi' ? '\u0915\u0943\u092a\u092f\u093e \u0938\u0939\u0940 \u0908\u092e\u0947\u0932 \u0926\u0930\u094d\u091c \u0915\u0930\u0947\u0902' : 'Please enter a valid email');
      return;
    }
    if (normalizedPassword.length < 8) {
      setError(language === 'hi' ? '\u092a\u093e\u0938\u0935\u0930\u094d\u0921 \u0915\u092e \u0938\u0947 \u0915\u092e 8 \u0905\u0915\u094d\u0937\u0930 \u0915\u093e \u0939\u094b\u0928\u093e \u091a\u093e\u0939\u093f\u090f' : 'Password must be at least 8 characters');
      return;
    }
    if (normalizedPassword !== confirmPassword) {
      setError(language === 'hi' ? '\u092a\u093e\u0938\u0935\u0930\u094d\u0921 \u092e\u0947\u0932 \u0928\u0939\u0940\u0902 \u0916\u093e \u0930\u0939\u093e' : 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          password: normalizedPassword,
          wantsDailyAlerts,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success || !data?.user) {
        setError(String(data?.error || (language === 'hi' ? '\u0930\u091c\u093f\u0938\u094d\u091f\u094d\u0930\u0947\u0936\u0928 \u0905\u0938\u092b\u0932' : 'Registration failed')));
        trackClientEvent({
          event: 'reader_auth_fail',
          page: '/main/account',
          source: 'reader_auth',
          metadata: { method: 'password_register', reason: 'api_error' },
        });
        return;
      }

      setUser(data.user as ReaderSession);
      setPassword('');
      setConfirmPassword('');
      setSuccess(language === 'hi' ? '\u0905\u0915\u093e\u0909\u0902\u091f \u092c\u0928 \u0917\u092f\u093e' : 'Account created successfully');
      trackClientEvent({
        event: 'reader_auth_success',
        page: '/main/account',
        source: 'reader_auth',
        metadata: { method: 'password_register' },
      });
    } catch {
      setError(language === 'hi' ? '\u0928\u0947\u091f\u0935\u0930\u094d\u0915 \u0924\u094d\u0930\u0941\u091f\u093f' : 'Network error. Please try again.');
      trackClientEvent({
        event: 'reader_auth_fail',
        page: '/main/account',
        source: 'reader_auth',
        metadata: { method: 'password_register', reason: 'network_error' },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    resetNotices();
    setIsSubmitting(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setPassword('');
      setConfirmPassword('');
      setName('');
      setSuccess(language === 'hi' ? 'लॉगआउट सफल' : 'Logged out');
    } catch {
      setError(language === 'hi' ? 'लॉगआउट असफल' : 'Failed to logout');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDailyAlertChange = async (nextValue: boolean) => {
    if (!user) return;
    resetNotices();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wantsDailyAlerts: nextValue }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success || !data?.user) {
        setError(String(data?.error || (language === 'hi' ? 'अपडेट असफल' : 'Failed to update')));
        return;
      }

      setUser(data.user as ReaderSession);
      setSuccess(language === 'hi' ? 'प्राथमिकताएं अपडेट हो गईं' : 'Preferences updated');
    } catch {
      setError(language === 'hi' ? 'नेटवर्क त्रुटि' : 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl py-3 sm:py-5">
      <div className="cnp-surface rounded-2xl p-4 sm:p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 sm:text-[2rem]">
            {t.heading}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            {t.subHeading}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-700/70 dark:bg-emerald-900/30 dark:text-emerald-300">
            <Shield className="h-3.5 w-3.5" />
            {t.secure}
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-700/70 dark:bg-red-900/25 dark:text-red-300">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-700/70 dark:bg-emerald-900/25 dark:text-emerald-300">
            {success}
          </div>
        ) : null}

        {isCheckingSession ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        ) : user ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {t.accountTitle}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t.accountHint}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {t.fullName}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {user.name}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {t.email}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(user.wantsDailyAlerts)}
                  onChange={(event) => void handleDailyAlertChange(event.target.checked)}
                  disabled={isSubmitting}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
                <span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    <Bell className="h-4 w-4 text-primary-600" />
                    {t.dailyAlerts}
                  </span>
                  <span className="mt-1 block text-xs text-zinc-600 dark:text-zinc-400">
                    {language === 'hi'
                      ? 'टॉगल ऑन करने पर दैनिक ई-पेपर अलर्ट सक्षम रहेगा।'
                      : 'Enable this to keep daily e-paper alerts active.'}
                  </span>
                </span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/main/epaper"
                className="attention-pulsate-bck inline-flex h-10 items-center gap-2 rounded-full border border-orange-300 bg-orange-50 px-4 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-500/40 dark:bg-orange-500/12 dark:text-orange-300 dark:hover:bg-orange-500/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                {t.openEpaper}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isSubmitting}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <LogOut className="h-4 w-4" />
                {isSubmitting ? t.loggingOut : t.logout}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-5 inline-flex rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  mode === 'login'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100'
                }`}
              >
                {t.login}
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  mode === 'register'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100'
                }`}
              >
                {t.register}
              </button>
            </div>

            <div className="mb-4 space-y-3">
              {GOOGLE_CLIENT_ID ? (
                <div>
                  <div
                    ref={googleButtonRef}
                    className="min-h-[44px] w-full overflow-hidden rounded-xl border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
                    aria-label={t.google}
                  />
                  {!isGoogleReady ? (
                    <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {t.google}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-700/70 dark:bg-amber-900/25 dark:text-amber-300">
                  {t.googleUnavailable}
                </div>
              )}

              {OIDC_ENABLED ? (
                <Link
                  href="/api/auth/oidc/start?redirect=/main/account"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Shield className="h-4 w-4" />
                  {t.oidc}
                </Link>
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                  {t.oidcUnavailable}
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {t.orContinueWithEmail}
                </span>
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
              </div>
            </div>

            <form
              onSubmit={mode === 'login' ? handleLogin : handleRegister}
              className="space-y-4"
            >
              {mode === 'register' ? (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {t.fullName}
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 outline-none transition focus:border-primary-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      placeholder={language === 'hi' ? 'अपना नाम लिखें' : 'Enter your name'}
                      autoComplete="name"
                      required
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {t.email}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 outline-none transition focus:border-primary-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {t.password}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-primary-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  placeholder="********"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
              </div>

              {mode === 'register' ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      {t.confirmPassword}
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-primary-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      placeholder="********"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <label className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={wantsDailyAlerts}
                      onChange={(event) => setWantsDailyAlerts(event.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500 dark:border-zinc-700"
                    />
                    <span>{t.dailyAlerts}</span>
                  </label>
                </>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {mode === 'login' ? t.submitLogin : t.submitRegister}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}





