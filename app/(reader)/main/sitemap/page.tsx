'use client';

import Link from 'next/link';
import { Building2, Compass, FileText, Globe2, LayoutGrid, Newspaper } from 'lucide-react';
import { useAppStore } from '@/lib/store/appStore';
import { NEWS_CATEGORIES, getNewsCategoryHref } from '@/lib/constants/newsCategories';

type SitemapLinkGroup = {
  titleEn: string;
  titleHi: string;
  icon: typeof Compass;
  links: { href: string; en: string; hi: string }[];
};

const TOP_LINKS = [
  { href: '/main', en: 'Home', hi: 'होम' },
  { href: '/main/latest', en: 'Latest News', hi: 'ताज़ा खबरें' },
  { href: '/main/videos', en: 'Videos', hi: 'वीडियो' },
  { href: '/main/epaper', en: 'E-Paper', hi: 'ई-पेपर' },
  { href: '/main/search', en: 'Search', hi: 'सर्च' },
  { href: '/main/saved', en: 'Saved', hi: 'सेव्ड' },
];

const COMPANY_LINKS = [
  { href: '/main/about', en: 'About Us', hi: 'हमारे बारे में' },
  { href: '/main/contact', en: 'Contact', hi: 'संपर्क' },
  { href: '/main/advertise', en: 'Advertise', hi: 'विज्ञापन' },
  { href: '/main/careers', en: 'Careers', hi: 'करियर' },
];

const LEGAL_LINKS = [
  { href: '/main/privacy', en: 'Privacy Policy', hi: 'प्राइवेसी पॉलिसी' },
  { href: '/main/terms', en: 'Terms & Conditions', hi: 'नियम और शर्तें' },
  { href: '/main/cookies', en: 'Cookie Policy', hi: 'कुकी नीति' },
  { href: '/main/disclaimer', en: 'Disclaimer', hi: 'अस्वीकरण' },
  { href: '/sitemap.xml', en: 'XML Sitemap', hi: 'XML साइटमैप' },
];

export default function SitemapPage() {
  const { language } = useAppStore();

  const categoryLinks = NEWS_CATEGORIES.slice(0, 8).map((category) => ({
    href: getNewsCategoryHref(category.slug),
    en: category.nameEn,
    hi: category.name,
  }));

  const groups: SitemapLinkGroup[] = [
    {
      titleEn: 'Top Pages',
      titleHi: 'मुख्य पेज',
      icon: LayoutGrid,
      links: TOP_LINKS,
    },
    {
      titleEn: 'News Categories',
      titleHi: 'समाचार श्रेणियाँ',
      icon: Newspaper,
      links: categoryLinks,
    },
    {
      titleEn: 'Company',
      titleHi: 'कंपनी',
      icon: Building2,
      links: COMPANY_LINKS,
    },
    {
      titleEn: 'Legal and Utility',
      titleHi: 'कानूनी और उपयोगी लिंक',
      icon: FileText,
      links: LEGAL_LINKS,
    },
  ];

  return (
    <section className="space-y-4 sm:space-y-5">
      <div className="cnp-surface p-5 sm:p-6">
        <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500 dark:text-red-300">
          {language === 'hi' ? 'साइटमैप' : 'Sitemap'}
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          {language === 'hi' ? 'लोकस्वामी साइटमैप' : 'Lokswami Sitemap'}
        </h1>
        <p className="mt-2 max-w-4xl text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          {language === 'hi'
            ? 'इस पेज से आप लोकस्वामी की प्रमुख श्रेणियों, कंपनी पेजों और कानूनी दस्तावेज़ों तक जल्दी पहुँच सकते हैं।'
            : 'Use this page to quickly navigate major Lokswami sections, company pages, and legal documents.'}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.titleEn} className="cnp-surface p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 sm:text-xl">
                  {language === 'hi' ? group.titleHi : group.titleEn}
                </h2>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {group.links.map((item) => {
                  const isExternal = item.href.startsWith('/sitemap.xml');
                  const label = language === 'hi' ? item.hi : item.en;
                  const className =
                    'rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-red-300 hover:text-orange-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:border-red-500/30 dark:hover:text-orange-400';

                  return isExternal ? (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={className}
                    >
                      {label}
                    </a>
                  ) : (
                    <Link key={item.href} href={item.href} className={className}>
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="cnp-surface p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 sm:text-xl">
            {language === 'hi' ? 'XML साइटमैप' : 'XML Sitemap'}
          </h2>
        </div>
        <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400 sm:text-[15px]">
          {language === 'hi'
            ? 'SEO और सर्च इंजन इंडेक्सिंग के लिए मशीन-रीडेबल साइटमैप यहाँ उपलब्ध है।'
            : 'The machine-readable sitemap used for search engine indexing is available here.'}
        </p>
        <a
          href="/sitemap.xml"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          {language === 'hi' ? 'sitemap.xml खोलें' : 'Open sitemap.xml'}
        </a>
      </div>
    </section>
  );
}
