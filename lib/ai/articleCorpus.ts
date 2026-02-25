import connectDB from '@/lib/db/mongoose';
import ArticleModel from '@/lib/models/Article';
import { listStoredArticles } from '@/lib/storage/articlesFile';
import type { Article } from '@/lib/mock/data';

const DEFAULT_AUTHOR_AVATAR = '/logo-icon-final.png';

type RawArticle = {
  _id?: string;
  id?: string;
  title?: string;
  summary?: string;
  content?: string;
  image?: string;
  category?: string;
  author?: string;
  publishedAt?: string | Date;
  views?: number;
  isBreaking?: boolean;
  isTrending?: boolean;
};

function toIsoDate(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function toAuthorId(name: string) {
  return `author-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'editor'}`;
}

function normalizeRawArticle(source: RawArticle | null | undefined): Article | null {
  if (!source) return null;
  const id = typeof source._id === 'string' ? source._id : typeof source.id === 'string' ? source.id : '';
  const title = typeof source.title === 'string' ? source.title.trim() : '';
  const summary = typeof source.summary === 'string' ? source.summary.trim() : '';
  const content = typeof source.content === 'string' ? source.content.trim() : '';
  const image = typeof source.image === 'string' ? source.image.trim() : '';
  const category = typeof source.category === 'string' ? source.category.trim() : '';
  const authorName = typeof source.author === 'string' ? source.author.trim() : 'Editor';
  const publishedAt = toIsoDate(source.publishedAt);
  const views = Number.isFinite(source.views) ? Number(source.views) : 0;

  if (!id || !title || !summary || !image || !category) return null;

  return {
    id,
    title,
    summary,
    content: content || summary,
    image,
    category,
    author: {
      id: toAuthorId(authorName),
      name: authorName || 'Editor',
      avatar: DEFAULT_AUTHOR_AVATAR,
    },
    publishedAt,
    views,
    isBreaking: Boolean(source.isBreaking),
    isTrending: Boolean(source.isTrending),
  };
}

async function loadFromMongo(limit: number) {
  if (!process.env.MONGODB_URI) return [] as Article[];
  try {
    await connectDB();
    const rows = await ArticleModel.find({})
      .select('title summary content image category author publishedAt views isBreaking isTrending')
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean<RawArticle[]>();

    return rows
      .map((row) => normalizeRawArticle(row))
      .filter((item): item is Article => Boolean(item));
  } catch (error) {
    console.error('AI corpus Mongo fallback triggered:', error);
    return [] as Article[];
  }
}

async function loadFromFile(limit: number) {
  try {
    const { data } = await listStoredArticles({
      limit,
      page: 1,
      category: null,
    });

    return data
      .map((row) => normalizeRawArticle(row))
      .filter((item): item is Article => Boolean(item));
  } catch (error) {
    console.error('AI corpus file load failed:', error);
    return [] as Article[];
  }
}

export async function getAiArticleCorpus(limit = 240) {
  const mongo = await loadFromMongo(limit);
  if (mongo.length) return mongo;
  return loadFromFile(limit);
}

export async function getAiArticleById(id: string) {
  const cleanId = id.trim();
  if (!cleanId) return null;
  const corpus = await getAiArticleCorpus(500);
  return corpus.find((item) => item.id === cleanId) || null;
}
