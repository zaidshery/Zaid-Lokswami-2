import { redirect } from 'next/navigation';

export default async function LegacyArticleRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/main/article/${encodeURIComponent(id)}`);
}
