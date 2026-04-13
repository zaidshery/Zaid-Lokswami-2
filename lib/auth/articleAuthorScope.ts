import type { AdminSessionIdentity } from '@/lib/auth/admin';

type ArticleAuthorScopeUser = Pick<AdminSessionIdentity, 'name' | 'email'>;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeAuthorIdentity(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s._-]+/g, ' ')
    .trim();
}

function getArticleAuthorScopeCandidates(user: ArticleAuthorScopeUser) {
  const emailLocalPart = user.email.split('@')[0] || '';

  return Array.from(
    new Set(
      [user.name, user.email, emailLocalPart]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  );
}

export function matchesArticleAuthorScope(
  author: string | null | undefined,
  user: ArticleAuthorScopeUser
) {
  const normalizedAuthor = normalizeAuthorIdentity(String(author || ''));
  if (!normalizedAuthor) return false;

  return getArticleAuthorScopeCandidates(user).some(
    (candidate) => normalizeAuthorIdentity(candidate) === normalizedAuthor
  );
}

export function buildArticleAuthorScopeFilters(user: ArticleAuthorScopeUser) {
  const patterns = new Map<string, RegExp>();

  for (const candidate of getArticleAuthorScopeCandidates(user)) {
    const exactPattern = new RegExp(`^${escapeRegExp(candidate)}$`, 'i');
    patterns.set(`${exactPattern.source}:${exactPattern.flags}`, exactPattern);

    const tokenizedSource = candidate
      .split(/[\s._-]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => escapeRegExp(part))
      .join('[\\s._-]+');

    if (tokenizedSource) {
      const flexiblePattern = new RegExp(`^${tokenizedSource}$`, 'i');
      patterns.set(`${flexiblePattern.source}:${flexiblePattern.flags}`, flexiblePattern);
    }
  }

  return Array.from(patterns.values()).map((pattern) => ({ author: pattern }));
}
