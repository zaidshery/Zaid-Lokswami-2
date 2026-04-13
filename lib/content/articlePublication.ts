import { resolveArticleWorkflow } from '@/lib/workflow/article';

type ArticlePublicationSource = {
  workflow?: unknown;
  publishedAt?: unknown;
  updatedAt?: unknown;
};

export function isPubliclyPublishedArticle(
  article: unknown
) {
  if (!article || typeof article !== 'object') {
    return false;
  }

  const source = article as ArticlePublicationSource;
  return resolveArticleWorkflow(source).status === 'published';
}
