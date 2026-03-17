'use client';

import { CalendarDays, Database, FileText, Globe2, Lock, Mail, ShieldCheck, UserCheck } from 'lucide-react';
import { useAppStore } from '@/lib/store/appStore';
import { COMPANY_INFO } from '@/lib/constants/company';

type PolicySection = {
  title: string;
  body: string[];
  bullets?: string[];
};

const LAST_UPDATED = 'March 17, 2026';

const POLICY_SECTIONS: PolicySection[] = [
  {
    title: '1. Scope of Policy',
    body: [
      'This Policy applies to all users accessing Lokswami digital platforms, including the website, mobile interfaces, newsletters, and embedded media services.',
    ],
  },
  {
    title: '2. Information We Collect',
    body: [
      'We may collect personal data voluntarily provided by users and certain data that is collected automatically while using the Services.',
    ],
    bullets: [
      'Name',
      'Email address',
      'Phone number',
      'Location such as city or state',
      'Any other information submitted through forms, comments, or communication',
      'IP address, device identifiers, browser type, usage patterns, pages visited, session duration, and referring URLs',
      'Cookies and similar technologies used to maintain session continuity, analyse traffic, and personalize content delivery',
      'User-generated content such as comments, tips, and media, which may be published publicly',
    ],
  },
  {
    title: '3. Legal Basis and Purpose of Processing',
    body: [
      'We process personal data based on user consent, legitimate interests such as improving Services and ensuring security, and compliance with legal obligations.',
      'Data may be used to provide and improve Services, respond to user queries, send communications where consent is provided, ensure platform security, and comply with regulatory requirements.',
    ],
  },
  {
    title: '4. Data Sharing and Disclosure',
    body: [
      'We may disclose information to employees, contractors, and service providers on a need-to-know basis, to analytics and hosting providers, when required by law, or where necessary to protect legal rights, prevent fraud, or ensure safety.',
      'We do not sell personal data.',
    ],
  },
  {
    title: '5. Data Retention',
    body: [
      'Personal data is retained only for as long as necessary to fulfil the purposes outlined in this Policy, comply with legal or regulatory obligations, and resolve disputes or enforce agreements.',
    ],
  },
  {
    title: '6. Data Security',
    body: [
      'We implement reasonable security practices and procedures to protect personal data from unauthorized access, disclosure, or misuse.',
      'However, users acknowledge that no system is completely secure and transmission of information over the internet involves inherent risks.',
    ],
  },
  {
    title: '7. User Rights (Under Applicable Law)',
    body: ['Subject to applicable law, users may have the right to:'],
    bullets: [
      'Access their personal data',
      'Request correction or updating of data',
      'Request erasure of personal data',
      'Withdraw consent where applicable',
      'Seek grievance redressal',
    ],
  },
  {
    title: "8. Children's Data",
    body: [
      'Lokswami does not knowingly collect personal data from children below the age of 13 years. If such data is identified, it will be deleted.',
    ],
  },
  {
    title: '9. Third-Party Services',
    body: [
      'Our Services may include third-party content such as embedded videos, advertisements, analytics tools, or social media integrations. Such third parties operate under their own privacy policies, and Lokswami is not responsible for their practices.',
    ],
  },
  {
    title: '10. Cross-Border Data Transfers',
    body: [
      'Where required, data may be processed or stored on servers located outside India, subject to applicable legal safeguards.',
    ],
  },
  {
    title: '11. Changes to Policy',
    body: [
      'Lokswami reserves the right to modify this Privacy Policy at any time. Updated versions will be published on this page with the revised date.',
      'Continued use of the Services constitutes acceptance of the updated Policy.',
    ],
  },
];

const SECTION_ICONS = [
  ShieldCheck,
  Database,
  FileText,
  Globe2,
  FileText,
  Lock,
  UserCheck,
  ShieldCheck,
  Globe2,
  Globe2,
  FileText,
];

const COPY = {
  en: {
    heroTag: 'Privacy Policy',
    title: 'Privacy Policy for Lokswami Newspaper and Lokswami Mojo',
    subtitle:
      'This policy explains how Lokswami collects, uses, shares, protects, and retains personal data across its digital products and related services.',
    legalNote:
      'This Privacy Policy is issued in compliance with applicable Indian laws, including the Information Technology Act, 2000, applicable rules thereunder, and the Digital Personal Data Protection Act, 2023, where applicable.',
    consentNote:
      'By accessing or using the Services, you consent to the collection and use of information in accordance with this Privacy Policy.',
    lastUpdated: 'Last updated',
    highlightsTitle: 'Key Privacy Areas',
    highlightLabels: ['Data Collection', 'Data Security', 'User Rights', 'Third-Party Services'],
    contactTitle: '12. Grievance Officer and Contact Details',
    contactText:
      'In accordance with applicable laws, users may contact the designated Grievance Officer using the details below.',
    grievanceOfficer: 'Grievance Officer',
    organization: 'Lokswami Newspaper / Lokswami Mojo',
    emailLabel: 'Email',
    addressLabel: 'Address',
  },
  hi: {
    heroTag: 'प्राइवेसी पॉलिसी',
    title: 'लोकस्वामी न्यूज़पेपर और लोकस्वामी मोजो की प्राइवेसी पॉलिसी',
    subtitle:
      'यह नीति बताती है कि लोकस्वामी अपनी डिजिटल सेवाओं में व्यक्तिगत डेटा कैसे एकत्र, उपयोग, साझा, सुरक्षित और संरक्षित करता है।',
    legalNote:
      'यह प्राइवेसी पॉलिसी लागू भारतीय कानूनों, जिनमें सूचना प्रौद्योगिकी अधिनियम 2000, उससे संबंधित नियम, और जहाँ लागू हो डिजिटल पर्सनल डेटा प्रोटेक्शन एक्ट 2023 शामिल हैं, के अनुरूप जारी की गई है।',
    consentNote:
      'सेवाओं का उपयोग करके आप इस प्राइवेसी पॉलिसी के अनुसार जानकारी के संग्रह और उपयोग के लिए सहमति देते हैं।',
    lastUpdated: 'अंतिम अपडेट',
    highlightsTitle: 'मुख्य प्राइवेसी बिंदु',
    highlightLabels: ['डेटा संग्रह', 'डेटा सुरक्षा', 'यूज़र अधिकार', 'थर्ड-पार्टी सेवाएँ'],
    contactTitle: '12. ग्रिवेंस ऑफिसर और संपर्क विवरण',
    contactText:
      'लागू कानूनों के अनुसार उपयोगकर्ता नीचे दिए गए विवरणों के माध्यम से निर्धारित ग्रिवेंस ऑफिसर से संपर्क कर सकते हैं।',
    grievanceOfficer: 'ग्रिवेंस ऑफिसर',
    organization: 'लोकस्वामी न्यूज़पेपर / लोकस्वामी मोजो',
    emailLabel: 'ईमेल',
    addressLabel: 'पता',
  },
} as const;

export default function PrivacyPage() {
  const { language } = useAppStore();
  const t = COPY[language];

  return (
    <section className="space-y-4 sm:space-y-5">
      <div className="cnp-surface p-5 sm:p-6">
        <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500 dark:text-red-300">
          {t.heroTag}
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          {t.title}
        </h1>
        <p className="mt-2 max-w-4xl text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          {t.subtitle}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50/70 px-3 py-1.5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
          <CalendarDays className="h-4 w-4 text-red-500" />
          {t.lastUpdated}: {LAST_UPDATED}
        </div>
        <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-400 sm:text-[15px]">
          {t.legalNote}
        </p>
        <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400 sm:text-[15px]">
          {t.consentNote}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {t.highlightLabels.map((label, index) => {
          const Icon = [Database, Lock, UserCheck, Globe2][index];
          return (
            <div key={label} className="cnp-surface p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <Icon className="h-4 w-4 text-red-500" />
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4">
        {POLICY_SECTIONS.map((section, index) => {
          const Icon = SECTION_ICONS[index] || FileText;
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
          {t.contactTitle}
        </h2>
        <p className="mt-2 max-w-4xl text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          {t.contactText}
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t.grievanceOfficer}
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t.organization}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t.emailLabel}
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
              {t.addressLabel}
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
