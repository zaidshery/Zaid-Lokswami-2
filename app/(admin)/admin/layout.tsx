'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import {
  BarChart3,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Newspaper,
  Settings,
  Sun,
  UserCog,
  Video,
  X,
} from 'lucide-react';
import Logo from '@/components/layout/Logo';
import { formatUserRoleLabel, isSuperAdminRole, type UserRole } from '@/lib/auth/roles';
import { useAppStore } from '@/lib/store/appStore';

type SidebarItem = {
  href: string;
  labelEn: string;
  labelHi: string;
  icon: typeof LayoutDashboard;
};

const SUPER_ADMIN_ITEMS: SidebarItem[] = [
  { icon: LayoutDashboard, labelEn: 'Dashboard', labelHi: 'डैशबोर्ड', href: '/admin' },
  { icon: FileText, labelEn: 'Articles', labelHi: 'लेख', href: '/admin/articles' },
  { icon: FolderOpen, labelEn: 'Categories', labelHi: 'श्रेणियाँ', href: '/admin/categories' },
  { icon: FileText, labelEn: 'Stories', labelHi: 'स्टोरीज़', href: '/admin/stories' },
  { icon: Video, labelEn: 'Videos', labelHi: 'वीडियो', href: '/admin/videos' },
  { icon: Newspaper, labelEn: 'E-Papers', labelHi: 'ई-पेपर', href: '/admin/epapers' },
  { icon: ImageIcon, labelEn: 'Media', labelHi: 'मीडिया', href: '/admin/media' },
  { icon: BarChart3, labelEn: 'Analytics', labelHi: 'एनालिटिक्स', href: '/admin/analytics' },
  { icon: UserCog, labelEn: 'Team', labelHi: 'टीम', href: '/admin/team' },
  { icon: Settings, labelEn: 'Settings', labelHi: 'सेटिंग्स', href: '/admin/settings' },
];

const EDITOR_ITEMS: SidebarItem[] = [
  { icon: LayoutDashboard, labelEn: 'Dashboard', labelHi: 'डैशबोर्ड', href: '/admin' },
  { icon: FileText, labelEn: 'Articles', labelHi: 'लेख', href: '/admin/articles' },
  { icon: FolderOpen, labelEn: 'Categories', labelHi: 'श्रेणियाँ', href: '/admin/categories' },
  { icon: FileText, labelEn: 'Stories', labelHi: 'स्टोरीज़', href: '/admin/stories' },
  { icon: Video, labelEn: 'Videos', labelHi: 'वीडियो', href: '/admin/videos' },
  { icon: Newspaper, labelEn: 'E-Papers', labelHi: 'ई-पेपर', href: '/admin/epapers' },
  { icon: ImageIcon, labelEn: 'Media', labelHi: 'मीडिया', href: '/admin/media' },
];

const AUTHOR_ITEMS: SidebarItem[] = [
  { icon: LayoutDashboard, labelEn: 'Dashboard', labelHi: 'डैशबोर्ड', href: '/admin' },
  { icon: FileText, labelEn: 'My Articles', labelHi: 'मेरे लेख', href: '/admin/articles?scope=mine' },
  { icon: ImageIcon, labelEn: 'Media', labelHi: 'मीडिया', href: '/admin/media' },
];

const VIEWER_ITEMS: SidebarItem[] = [
  { icon: LayoutDashboard, labelEn: 'Dashboard', labelHi: 'डैशबोर्ड', href: '/admin' },
];

function getSidebarItems(role: UserRole | undefined): SidebarItem[] {
  if (isSuperAdminRole(role)) {
    return SUPER_ADMIN_ITEMS;
  }

  switch (role) {
    case 'editor':
    case 'admin':
      return EDITOR_ITEMS;
    case 'author':
      return AUTHOR_ITEMS;
    case 'viewer':
      return VIEWER_ITEMS;
    default:
      return VIEWER_ITEMS;
  }
}

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
  const sidebarItems = useMemo(
    () => getSidebarItems(session?.user?.role),
    [session?.user?.role]
  );
  const adminName =
    session?.user?.name?.trim() ||
    session?.user?.email?.split('@')[0]?.trim() ||
    'Admin';
  const adminEmail = session?.user?.email?.trim() || '';
  const adminRoleLabel = formatUserRoleLabel(session?.user?.role);
  const adminInitial = (adminName.charAt(0) || 'A').toUpperCase();

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
    } catch {
      // Ignore client sign-out errors and still force navigation to signin.
    }

    router.push('/signin');
    router.refresh();
  };

  return (
    <div className="admin-shell flex min-h-screen bg-zinc-50 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 272 : 82 }}
        className="fixed bottom-0 left-0 top-0 z-40 border-r border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          {isSidebarOpen ? (
            <Link href="/admin" className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex-shrink-0">
                <Logo size="sm" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {isHindi ? 'एडमिन पैनल' : 'Admin Panel'}
                </div>
                <div className="truncate text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                  {adminRoleLabel}
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/admin" className="flex flex-1 justify-center">
              <Logo size="sm" />
            </Link>
          )}

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            type="button"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <nav className="space-y-2 p-4">
          {sidebarItems.map((item) => (
            <Link
              key={`${item.href}-${item.labelEn}`}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {isSidebarOpen ? (
                <span className="text-sm font-medium">
                  {isHindi ? item.labelHi : item.labelEn}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            type="button"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen ? (
              <span className="text-sm font-medium">{isHindi ? 'लॉगआउट' : 'Logout'}</span>
            ) : null}
          </button>
        </div>
      </motion.aside>

      <main
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: isSidebarOpen ? 272 : 82 }}
      >
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {isHindi ? 'एडमिन डैशबोर्ड' : 'Admin Dashboard'}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{adminRoleLabel}</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-label={isHindi ? 'Switch to English' : 'Switch to Hindi'}
              type="button"
            >
              <Languages className="h-3.5 w-3.5" />
              <span>{isHindi ? 'हि' : 'EN'}</span>
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
              href="/main"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              {isHindi ? 'साइट देखें' : 'View Site'}
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
              <span className="text-sm font-bold text-white">{adminInitial}</span>
            </div>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
