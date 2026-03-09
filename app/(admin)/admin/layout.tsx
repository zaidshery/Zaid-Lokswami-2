'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import { 
  LayoutDashboard, 
  FileText, 
  Video, 
  Newspaper, 
  FolderOpen,
  Image as ImageIcon,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Languages
} from 'lucide-react';
import { useState } from 'react';
import Logo from '@/components/layout/Logo';
import { useAppStore } from '@/lib/store/appStore';

const sidebarItems = [
  { icon: LayoutDashboard, labelEn: 'Dashboard', labelHi: '\u0921\u0948\u0936\u092c\u094b\u0930\u094d\u0921', href: '/admin' },
  { icon: FileText, labelEn: 'Articles', labelHi: '\u0932\u0947\u0916', href: '/admin/articles' },
  { icon: FileText, labelEn: 'Stories', labelHi: '\u0938\u094d\u091f\u094b\u0930\u0940\u091c\u093c', href: '/admin/stories' },
  { icon: FolderOpen, labelEn: 'Categories', labelHi: '\u0936\u094d\u0930\u0947\u0923\u093f\u092f\u093e\u0901', href: '/admin/categories' },
  { icon: ImageIcon, labelEn: 'Media', labelHi: '\u092e\u0940\u0921\u093f\u092f\u093e', href: '/admin/media' },
  { icon: Video, labelEn: 'Videos', labelHi: '\u0935\u0940\u0921\u093f\u092f\u094b', href: '/admin/videos' },
  { icon: Newspaper, labelEn: 'E-Papers', labelHi: '\u0908-\u092a\u0947\u092a\u0930', href: '/admin/epapers' },
  { icon: MessageSquare, labelEn: 'Contact Inbox', labelHi: '\u0938\u0902\u092a\u0930\u094d\u0915 \u0907\u0928\u092c\u0949\u0915\u094d\u0938', href: '/admin/contact-messages' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { theme, toggleTheme, language, toggleLanguage } = useAppStore();
  const isHindi = language === 'hi';
  const adminName =
    session?.user?.name?.trim() ||
    session?.user?.email?.split('@')[0]?.trim() ||
    'Admin';
  const adminEmail = session?.user?.email?.trim() || '';
  const adminInitial = (adminName.charAt(0) || 'A').toUpperCase();

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
    } catch {
      // Ignore client sign-out errors and still force navigation to login.
    }

    router.push('/login');
    router.refresh();
  };

  return (
    <div className="admin-shell flex min-h-screen bg-zinc-50 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="fixed bottom-0 left-0 top-0 z-40 border-r border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          {isSidebarOpen && (
            <Link href="/admin" className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <Logo size="sm" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {isHindi ? '\u090f\u0921\u092e\u093f\u0928 \u092a\u0948\u0928\u0932' : 'Admin Panel'}
                </div>
              </div>
            </Link>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && (
                <span className="text-sm font-medium">{isHindi ? item.labelHi : item.labelEn}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && (
              <span className="text-sm font-medium">
                {isHindi ? '\u0932\u0949\u0917\u0906\u0909\u091f' : 'Logout'}
              </span>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main 
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: isSidebarOpen ? 260 : 80 }}
      >
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {isHindi ? '\u090f\u0921\u092e\u093f\u0928 \u0921\u0948\u0936\u092c\u094b\u0930\u094d\u0921' : 'Admin Dashboard'}
          </h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-label={isHindi ? 'Switch to English' : 'Switch to Hindi'}
              type="button"
            >
              <Languages className="h-3.5 w-3.5" />
              <span>{isHindi ? '\u0939\u093f' : 'EN'}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-200 p-1.5 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              type="button"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link 
              href="/" 
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              {isHindi ? '\u0938\u093e\u0907\u091f \u0926\u0947\u0916\u0947\u0902' : 'View Site'}
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {adminName}
              </p>
              {adminEmail ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{adminEmail}</p>
              ) : null}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600">
              <span className="text-white text-sm font-bold">{adminInitial}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
