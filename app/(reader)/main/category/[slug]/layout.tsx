import type { Metadata } from 'next';
import { buildCategoryPageMetadata } from '@/lib/seo/readerPageMetadata';

type LayoutContext = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(context: LayoutContext): Promise<Metadata> {
  const { slug } = await context.params;
  return buildCategoryPageMetadata(decodeURIComponent(slug));
}

export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
