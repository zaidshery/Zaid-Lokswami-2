'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Newspaper, PlayCircle, Zap } from 'lucide-react';
import { NEWS_CATEGORIES, getNewsCategoryHref } from '@/lib/constants/newsCategories';

const mainNav = [
  { icon: Home, label: 'Home', href: '/main' },
  { icon: PlayCircle, label: 'Videos', href: '/main/videos' },
  { icon: Newspaper, label: 'E-Paper', href: '/main/epaper' },
  { icon: Zap, label: 'Fatafat', href: '/main/ftaftaf' },
];

export default function SideRail() {
  const pathname = usePathname();

  return (
    <aside className="z-40 hidden w-[72px] shrink-0 flex-col border-r border-zinc-200/80 bg-white/95 shadow-[var(--shadow-soft)] transition-colors duration-300 dark:border-zinc-800 dark:bg-zinc-950/95 xl:sticky xl:top-[9.25rem] xl:flex xl:h-[calc(100vh-9.25rem)]">
      <div className="space-y-1.5 px-2 py-2">
        {mainNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`cnp-motion flex h-11 w-full items-center justify-center rounded-xl ${
                isActive
                  ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon size={22} strokeWidth={isActive ? 2.4 : 2.1} />
            </Link>
          );
        })}
      </div>

      <div className="mx-3 border-t border-gray-200 dark:border-gray-800" />

      <div className="flex-1 space-y-2 overflow-y-auto px-2 py-2.5 scrollbar-hide">
        {NEWS_CATEGORIES.map((cat) => {
          const href = getNewsCategoryHref(cat.slug);
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={cat.id}
              href={href}
              className={`cnp-motion flex h-10 w-full items-center justify-center rounded-xl ${
                isActive ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
              }`}
              title={cat.nameEn || cat.name}
              aria-label={cat.nameEn || cat.name}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: cat.color }}
              >
                {cat.name.charAt(0)}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
