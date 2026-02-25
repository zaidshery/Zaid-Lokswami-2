import type { Article, Story } from '@/lib/mock/data';

export type VisualStory = Story & { href?: string };

const USE_REMOTE_DEMO_MEDIA =
  process.env.NEXT_PUBLIC_USE_REMOTE_DEMO_MEDIA === 'true';
const UNSPLASH_IMAGE_HOST = /^https:\/\/images\.unsplash\.com\//i;
const LOCAL_STORY_FALLBACK = '/placeholders/story-9x16.svg';

function normalizeStoryMedia(value: string) {
  const media = value.trim();
  if (!media) return '';
  if (!USE_REMOTE_DEMO_MEDIA && UNSPLASH_IMAGE_HOST.test(media)) {
    return LOCAL_STORY_FALLBACK;
  }
  return media;
}

function buildStoryTitle(article: Article) {
  const title = (article.title || '').trim();
  if (!title) return 'Story';
  return title.length > 48 ? `${title.slice(0, 48).trim()}...` : title;
}

export function buildVisualStoriesFromArticles(
  articles: Article[],
  limit = 10
): VisualStory[] {
  const sorted = [...articles].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const stories: VisualStory[] = [];
  const seen = new Set<string>();

  for (const article of sorted) {
    const image = normalizeStoryMedia(article.image || '');
    if (!image) continue;

    const dedupeKey = `${image}|${article.title.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    stories.push({
      id: `story-${article.id}`,
      title: buildStoryTitle(article),
      caption: article.summary,
      thumbnail: image,
      mediaType: 'image',
      mediaUrl: image,
      linkLabel: 'Read Story',
      category: article.category,
      author: article.author?.name || 'Desk',
      durationSeconds: 6,
      priority: 0,
      views: article.views || 0,
      publishedAt: article.publishedAt,
      viewed: false,
      href: `/main/article/${encodeURIComponent(article.id)}`,
    });

    if (stories.length >= limit) break;
  }

  return stories;
}

type ApiStory = {
  _id?: string;
  id?: string;
  title?: string;
  caption?: string;
  thumbnail?: string;
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
  category?: string;
  author?: string;
  durationSeconds?: number;
  priority?: number;
  views?: number;
  publishedAt?: string;
  isPublished?: boolean;
};

function normalizeHref(rawValue: string, title: string) {
  const value = rawValue.trim();
  if (!value) return `/main/search?q=${encodeURIComponent(title)}`;

  if (
    value.startsWith('/') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value;
  }

  return `/main/search?q=${encodeURIComponent(title)}`;
}

function normalizeDuration(value: number | undefined, mediaType: 'image' | 'video') {
  const fallback = mediaType === 'video' ? 8 : 6;
  if (!Number.isFinite(value)) return fallback;
  return Math.max(2, Math.min(30, Number(value)));
}

export function mapLiveStoriesToVisualStories(
  rows: ApiStory[],
  limit = 20
): VisualStory[] {
  const mapped = rows
    .map((row, index) => {
      const id = row._id || row.id || `live-story-${index}`;
      const title = (row.title || '').trim();
      const thumbnail = normalizeStoryMedia(row.thumbnail || '');
      const mediaType: 'image' | 'video' =
        row.mediaType === 'video' ? 'video' : 'image';
      const mediaUrl = normalizeStoryMedia(row.mediaUrl || '') || thumbnail;
      const isPublished = row.isPublished === false ? false : true;

      if (!id || !title || !thumbnail || !isPublished) return null;

      const story: VisualStory = {
        id,
        title,
        caption: (row.caption || '').trim(),
        thumbnail,
        mediaType,
        mediaUrl,
        linkUrl: (row.linkUrl || '').trim(),
        linkLabel: (row.linkLabel || '').trim(),
        category: (row.category || 'General').trim(),
        author: (row.author || 'Desk').trim(),
        durationSeconds: normalizeDuration(row.durationSeconds, mediaType),
        priority: Number.isFinite(row.priority) ? Number(row.priority) : 0,
        views: Number.isFinite(row.views) ? Number(row.views) : 0,
        publishedAt: row.publishedAt || new Date().toISOString(),
        href: normalizeHref((row.linkUrl || '').trim(), title),
        viewed: false,
      };

      return story;
    })
    .filter((item): item is VisualStory => item !== null)
    .sort((a, b) => {
      const byPriority = (b.priority || 0) - (a.priority || 0);
      if (byPriority !== 0) return byPriority;
      return new Date(b.publishedAt || '').getTime() - new Date(a.publishedAt || '').getTime();
    });

  const unique = new Set<string>();
  const stories: VisualStory[] = [];

  for (const story of mapped) {
    if (unique.has(story.id)) continue;
    unique.add(story.id);
    stories.push(story);
    if (stories.length >= limit) break;
  }

  return stories;
}
