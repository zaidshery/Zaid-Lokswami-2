import type { Metadata } from 'next';
import { COMPANY_INFO } from '@/lib/constants/company';

const FALLBACK_SITE_URL = 'http://localhost:3000';

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/, '');
}

export const metadata: Metadata = (() => {
  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL
  );
  const title = `Contact Us | ${COMPANY_INFO.name}`;
  const description =
    'Contact Lokswami for news tips, advertising, partnerships, and support. Fast response from the newsroom team.';
  const canonical = `${siteUrl}/main/contact`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      siteName: COMPANY_INFO.name,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
})();

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

