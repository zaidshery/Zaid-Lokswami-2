'use client';

import type { LucideIcon } from 'lucide-react';
import { CalendarDays, Mail } from 'lucide-react';
import { COMPANY_INFO } from '@/lib/constants/company';

export type LegalPageHighlight = {
  label: string;
  icon: LucideIcon;
};

export type LegalPageSection = {
  title: string;
  body: string[];
  bullets?: string[];
  icon: LucideIcon;
};

type LegalPageLayoutProps = {
  heroTag: string;
  title: string;
  subtitle: string;
  legalNote?: string;
  consentNote?: string;
  lastUpdatedLabel: string;
  lastUpdated: string;
  highlightsTitle: string;
  highlights: LegalPageHighlight[];
  sections: LegalPageSection[];
  contactTitle: string;
  contactText: string;
  contactRoleLabel: string;
  contactRoleValue: string;
  emailLabel: string;
  addressLabel: string;
};

export default function LegalPageLayout({
  heroTag,
  title,
  subtitle,
  legalNote,
  consentNote,
  lastUpdatedLabel,
  lastUpdated,
  highlightsTitle,
  highlights,
  sections,
  contactTitle,
  contactText,
  contactRoleLabel,
  contactRoleValue,
  emailLabel,
  addressLabel,
}: LegalPageLayoutProps) {
  return (
    <section className="space-y-4 sm:space-y-5">
      <div className="cnp-surface p-5 sm:p-6">
        <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500 dark:text-red-300">
          {heroTag}
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-4xl text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          {subtitle}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50/70 px-3 py-1.5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
          <CalendarDays className="h-4 w-4 text-red-500" />
          {lastUpdatedLabel}: {lastUpdated}
        </div>
        {legalNote ? (
          <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400 sm:text-[15px]">
            {legalNote}
          </p>
        ) : null}
        {consentNote ? (
          <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400 sm:text-[15px]">
            {consentNote}
          </p>
        ) : null}
      </div>

      <div className="cnp-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 sm:text-xl">
          {highlightsTitle}
        </h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <Icon className="h-4 w-4 text-red-500" />
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="cnp-surface p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 dark:text-red-300">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 sm:text-xl">
                    {section.title}
                  </h2>
                  {section.body.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400 sm:text-[15px]"
                    >
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets ? (
                    <ul className="mt-3 space-y-2">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300"
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cnp-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 sm:text-xl">
          {contactTitle}
        </h2>
        <p className="mt-2 max-w-4xl text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          {contactText}
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {contactRoleLabel}
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {contactRoleValue}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {emailLabel}
            </p>
            <a
              href={`mailto:${COMPANY_INFO.contact.email}`}
              className="mt-2 inline-flex items-center gap-2 break-all text-sm font-semibold text-zinc-800 hover:text-orange-600 dark:text-zinc-200 dark:hover:text-orange-400"
            >
              <Mail className="h-4 w-4 text-orange-500" />
              {COMPANY_INFO.contact.email}
            </a>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {addressLabel}
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {COMPANY_INFO.address.street}, {COMPANY_INFO.address.road}, {COMPANY_INFO.address.city},{' '}
              {COMPANY_INFO.address.state}, {COMPANY_INFO.address.country}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
