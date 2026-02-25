'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, PlayCircle, Newspaper, Zap, Menu, User } from 'lucide-react';
import { useAppStore } from '@/lib/store/appStore';

interface BottomNavProps {
  onMenuClick: () => void;
  isMenuOpen?: boolean;
}

const navItems = [
  { icon: Home, label: '\u0939\u094b\u092e', labelEn: 'Home', href: '/main' },
  { icon: PlayCircle, label: '\u0935\u0940\u0921\u093f\u092f\u094b', labelEn: 'Videos', href: '/main/videos' },
  { icon: Newspaper, label: '\u0908-\u092a\u0947\u092a\u0930', labelEn: 'E-Paper', href: '/main/epaper', isCenter: true },
  { icon: Zap, label: '\u095e\u091f\u093e\u095e\u091f', labelEn: 'Quick', href: '/main/ftaftaf' },
  { icon: Menu, label: '\u092e\u0947\u0928\u0942', labelEn: 'Menu', href: '#', isMenu: true },
  { icon: User, label: '\u0905\u0915\u093e\u0909\u0902\u091f', labelEn: 'Account', href: '/main/account' },
];

export default function BottomNav({ onMenuClick, isMenuOpen = false }: BottomNavProps) {
  const pathname = usePathname();
  const { language } = useAppStore();

  return (
    <nav
      role="navigation"
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200/90 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 xl:hidden"
    >
      <div className="mx-auto grid h-16 w-full max-w-2xl grid-cols-6 items-center gap-x-1 px-2 pb-safe sm:gap-x-2 sm:px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const label = language === 'hi' ? item.label : item.labelEn;
          const isActive = item.href !== '#' && (pathname === item.href || pathname.startsWith(`${item.href}/`));

          if (item.isMenu) {
            return (
              <motion.button
                key="menu"
                onClick={onMenuClick}
                whileTap={{ scale: 0.96 }}
                className={`cnp-motion relative flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 ${
                  isMenuOpen ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100'
                }`}
                aria-label={label}
                aria-controls="mobile-drawer"
                aria-expanded={isMenuOpen}
                type="button"
              >
                <Icon size={22} strokeWidth={2} />
                <span className="text-[11px] font-semibold leading-none">{label}</span>
              </motion.button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1.5"
            >
              {isActive ? (
                <motion.div
                  layoutId="bottomNavActive"
                  className="absolute inset-1 rounded-xl bg-red-50 dark:bg-red-500/10"
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                />
              ) : null}

              <Icon
                size={22}
                strokeWidth={isActive ? 2.35 : 2}
                className={`cnp-motion relative z-10 ${isActive ? 'text-red-600 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-300'}`}
              />
              <span
                className={`cnp-motion relative z-10 text-[11px] font-semibold leading-none ${
                  isActive ? 'text-red-600 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
