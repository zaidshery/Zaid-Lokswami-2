import type { Metadata } from 'next';
import { COMPANY_INFO } from '@/lib/constants/company';
import { getArticleForMetadata } from '@/lib/content/serverArticles';

const fallbackSiteUrl = 'http://localhost:3000';

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function toAbsoluteUrl(input: string, siteUrl: string) {
  if (!input) return '';
  if (/^https?:\/\//i.test(input)) return input;
  if (!input.startsWith('/')) return `${siteUrl}/${input}`;
  return `${siteUrl}${input}`;
}

type LayoutContext = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(context: LayoutContext): Promise<Metadata> {
  const { id } = await context.params;
  const decodedId = decodeURIComponent(id);
  const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl);

  const article = await getArticleForMetadata(decodedId);
  if (!article) {
    return {
      title: `Article | ${COMPANY_INFO.name}`,
      description: COMPANY_INFO.tagline.en,
      robots: { index: false, follow: true },
    };
  }

  const seoTitle = article.seo.metaTitle || article.title;
  const title = `${seoTitle} | ${COMPANY_INFO.name}`;
  const description = article.seo.metaDescription || article.summary;
  const canonical =
    article.seo.canonicalUrl || `${siteUrl}/main/article/${encodeURIComponent(decodedId)}`;
  const ogImageRaw = article.seo.ogImage || article.image;
  const ogImage = ogImageRaw ? toAbsoluteUrl(ogImageRaw, siteUrl) : '';

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      siteName: COMPANY_INFO.name,
      section: article.category,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: seoTitle,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  };
}

export default function ArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
