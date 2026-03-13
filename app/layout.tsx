import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import AuthSync from '@/components/providers/AuthSync';
import AuthSessionProvider from '@/components/providers/SessionProvider';
import InstallAppPrompt from '@/components/ui/InstallAppPrompt';

const THEME_INIT_SCRIPT = `
(() => {
  const STORAGE_KEY = 'lokswami-storage';
  const root = document.documentElement;
  const getSystemTheme = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const applyTheme = (theme) => {
    root.classList.toggle('dark', theme === 'dark');
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      applyTheme(getSystemTheme());
      return;
    }
    const parsed = JSON.parse(raw);
    const storedTheme = parsed?.state?.theme;
    if (storedTheme === 'dark' || storedTheme === 'light') {
      applyTheme(storedTheme);
      return;
    }
    applyTheme(getSystemTheme());
  } catch {
    applyTheme(getSystemTheme());
  }
})();
`;

export const metadata: Metadata = {
  title: 'Lokswami - \u092d\u093e\u0930\u0924 \u0915\u093e \u0938\u092c\u0938\u0947 \u0935\u093f\u0936\u094d\u0935\u0938\u0928\u0940\u092f \u0938\u092e\u093e\u091a\u093e\u0930 \u092a\u094d\u0932\u0947\u091f\u092b\u0949\u0930\u094d\u092e',
  applicationName: 'Lokswami',
  description:
    '\u0924\u093e\u091c\u093c\u093e \u0916\u092c\u0930\u0947\u0902, \u0935\u0940\u0921\u093f\u092f\u094b, \u0908-\u092a\u0947\u092a\u0930 \u0914\u0930 \u092c\u0939\u0941\u0924 \u0915\u0941\u091b\u0964 India\'s most trusted digital news platform with latest news, videos, and e-paper.',
  keywords:
    'Hindi news, \u092d\u093e\u0930\u0924\u0940\u092f \u0938\u092e\u093e\u091a\u093e\u0930, \u0924\u093e\u091c\u093c\u093e \u0916\u092c\u0930\u0947\u0902, breaking news, Lokswami, \u0932\u094b\u0915\u0938\u094d\u0935\u093e\u092e\u0940',
  authors: [{ name: 'Lokswami' }],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/logo-icon-final.png',
    apple: '/logo-icon-final.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lokswami',
  },
  openGraph: {
    title: 'Lokswami - \u092d\u093e\u0930\u0924 \u0915\u093e \u0938\u092c\u0938\u0947 \u0935\u093f\u0936\u094d\u0935\u0938\u0928\u0940\u092f \u0938\u092e\u093e\u091a\u093e\u0930 \u092a\u094d\u0932\u0947\u091f\u092b\u0949\u0930\u094d\u092e',
    description:
      '\u0924\u093e\u091c\u093c\u093e \u0916\u092c\u0930\u0947\u0902, \u0935\u0940\u0921\u093f\u092f\u094b, \u0908-\u092a\u0947\u092a\u0930 \u0914\u0930 \u092c\u0939\u0941\u0924 \u0915\u0941\u091b\u0964',
    type: 'website',
    locale: 'hi_IN',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#e72129',
};

/** Renders the shared HTML shell and top-level client providers. */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hi" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <script id="lokswami-theme-init" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className="min-h-screen bg-white text-gray-900 antialiased transition-colors duration-300 dark:bg-gray-950 dark:text-gray-50"
      >
        <AuthSessionProvider>
          <ThemeProvider>
            <AuthSync />
            {children}
            <InstallAppPrompt />
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
