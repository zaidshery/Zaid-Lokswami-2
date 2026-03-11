import connectDB from '@/lib/db/mongoose';
import Article from '@/lib/models/Article';
import ContactMessage from '@/lib/models/ContactMessage';
import EPaper from '@/lib/models/EPaper';
import Video from '@/lib/models/Video';
import { listAllStoredArticles } from '@/lib/storage/articlesFile';
import { listStoredContactMessages } from '@/lib/storage/contactMessagesFile';
import { listAllStoredEPapers } from '@/lib/storage/epapersFile';
import { listAllStoredVideos } from '@/lib/storage/videosFile';

type DashboardArticle = {
  id: string;
  title: string;
  category: string;
  author: string;
  publishedAt: string;
  views: number;
};

type DashboardVideo = {
  id: string;
  title: string;
  category: string;
  publishedAt: string;
  views: number;
  duration: number;
};

export type AdminDashboardData = {
  source: 'mongodb' | 'file' | 'hybrid';
  stats: {
    totalArticles: number;
    totalVideos: number;
    totalEPapers: number;
    newMessages: number;
  };
  inbox: {
    all: number;
    new: number;
    inProgress: number;
    resolved: number;
  };
  popularArticles: DashboardArticle[];
  recentArticles: DashboardArticle[];
  recentVideos: DashboardVideo[];
};

function toIsoDate(value: unknown) {
  const parsed = new Date(
    typeof value === 'string' || typeof value === 'number' || value instanceof Date
      ? value
      : Date.now()
  );

  if (Number.isNaN(parsed.getTime())) {
    return new Date(0).toISOString();
  }

  return parsed.toISOString();
}

function toDateMs(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDashboardArticle(source: unknown): DashboardArticle | null {
  const input =
    typeof source === 'object' && source ? (source as Record<string, unknown>) : null;
  if (!input) {
    return null;
  }

  const id = String(input._id || input.id || '').trim();
  const title = String(input.title || '').trim();
  if (!id || !title) {
    return null;
  }

  const authorValue = input.author;
  const author =
    typeof authorValue === 'string'
      ? authorValue.trim()
      : typeof authorValue === 'object' && authorValue
        ? String((authorValue as Record<string, unknown>).name || '').trim()
        : '';

  return {
    id,
    title,
    category: String(input.category || 'General').trim() || 'General',
    author: author || 'Desk',
    publishedAt: toIsoDate(input.publishedAt),
    views: Number.isFinite(Number(input.views)) ? Number(input.views) : 0,
  };
}

function normalizeDashboardVideo(source: unknown): DashboardVideo | null {
  const input =
    typeof source === 'object' && source ? (source as Record<string, unknown>) : null;
  if (!input) {
    return null;
  }

  const id = String(input._id || input.id || '').trim();
  const title = String(input.title || '').trim();
  if (!id || !title) {
    return null;
  }

  return {
    id,
    title,
    category: String(input.category || 'General').trim() || 'General',
    publishedAt: toIsoDate(input.publishedAt || input.createdAt),
    views: Number.isFinite(Number(input.views)) ? Number(input.views) : 0,
    duration: Number.isFinite(Number(input.duration)) ? Number(input.duration) : 0,
  };
}

function hasDashboardSignal(data: AdminDashboardData) {
  return Boolean(
    data.stats.totalArticles ||
      data.stats.totalVideos ||
      data.stats.totalEPapers ||
      data.inbox.all ||
      data.popularArticles.length ||
      data.recentArticles.length ||
      data.recentVideos.length
  );
}

function pickPreferredCount(primary: number, fallback: number) {
  return primary > 0 ? primary : fallback;
}

function pickPreferredList<T>(primary: T[], fallback: T[]) {
  return primary.length ? primary : fallback;
}

async function shouldUseFileStore() {
  if (!process.env.MONGODB_URI) {
    return true;
  }

  try {
    await connectDB();
    return false;
  } catch (error) {
    console.error('MongoDB unavailable for admin dashboard, using file store.', error);
    return true;
  }
}

async function loadFromMongo(): Promise<AdminDashboardData> {
  const [
    totalArticles,
    totalVideos,
    totalEPapers,
    allMessages,
    newMessages,
    inProgressMessages,
    resolvedMessages,
    popularArticleDocs,
    recentArticleDocs,
    recentVideoDocs,
  ] = await Promise.all([
    Article.countDocuments({}),
    Video.countDocuments({ isPublished: true }),
    EPaper.countDocuments({ status: 'published' }),
    ContactMessage.countDocuments({}),
    ContactMessage.countDocuments({ status: 'new' }),
    ContactMessage.countDocuments({ status: 'in_progress' }),
    ContactMessage.countDocuments({ status: 'resolved' }),
    Article.find({})
      .select('_id title category author publishedAt views')
      .sort({ views: -1, publishedAt: -1, _id: -1 })
      .limit(4)
      .lean(),
    Article.find({})
      .select('_id title category author publishedAt views')
      .sort({ publishedAt: -1, _id: -1 })
      .limit(5)
      .lean(),
    Video.find({ isPublished: true })
      .select('_id title category duration publishedAt views')
      .sort({ publishedAt: -1, _id: -1 })
      .limit(3)
      .lean(),
  ]);

  return {
    source: 'mongodb',
    stats: {
      totalArticles,
      totalVideos,
      totalEPapers,
      newMessages,
    },
    inbox: {
      all: allMessages,
      new: newMessages,
      inProgress: inProgressMessages,
      resolved: resolvedMessages,
    },
    popularArticles: popularArticleDocs
      .map((item) => normalizeDashboardArticle(item))
      .filter((item): item is DashboardArticle => Boolean(item)),
    recentArticles: recentArticleDocs
      .map((item) => normalizeDashboardArticle(item))
      .filter((item): item is DashboardArticle => Boolean(item)),
    recentVideos: recentVideoDocs
      .map((item) => normalizeDashboardVideo(item))
      .filter((item): item is DashboardVideo => Boolean(item)),
  };
}

async function loadFromFileStore(): Promise<AdminDashboardData> {
  const [articles, videos, epapers, contactResult] = await Promise.all([
    listAllStoredArticles(),
    listAllStoredVideos(),
    listAllStoredEPapers(),
    listStoredContactMessages({ page: 1, limit: 1, status: 'all' }),
  ]);

  const normalizedArticles = articles
    .map((item) => normalizeDashboardArticle(item))
    .filter((item): item is DashboardArticle => Boolean(item));
  const normalizedVideos = videos
    .filter((item) => item.isPublished !== false)
    .map((item) => normalizeDashboardVideo(item))
    .filter((item): item is DashboardVideo => Boolean(item));

  const popularArticles = [...normalizedArticles]
    .sort((left, right) => {
      if (right.views !== left.views) {
        return right.views - left.views;
      }

      return toDateMs(right.publishedAt) - toDateMs(left.publishedAt);
    })
    .slice(0, 4);

  const recentArticles = [...normalizedArticles]
    .sort((left, right) => toDateMs(right.publishedAt) - toDateMs(left.publishedAt))
    .slice(0, 5);

  const recentVideos = [...normalizedVideos]
    .sort((left, right) => toDateMs(right.publishedAt) - toDateMs(left.publishedAt))
    .slice(0, 3);

  return {
    source: 'file',
    stats: {
      totalArticles: normalizedArticles.length,
      totalVideos: normalizedVideos.length,
      totalEPapers: epapers.length,
      newMessages: contactResult.counts.new,
    },
    inbox: {
      all: contactResult.counts.all,
      new: contactResult.counts.new,
      inProgress: contactResult.counts.in_progress,
      resolved: contactResult.counts.resolved,
    },
    popularArticles,
    recentArticles,
    recentVideos,
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  if (await shouldUseFileStore()) {
    return loadFromFileStore();
  }

  const [mongoData, fileData] = await Promise.all([
    loadFromMongo(),
    loadFromFileStore(),
  ]);

  const mongoHasData = hasDashboardSignal(mongoData);
  const fileHasData = hasDashboardSignal(fileData);

  if (mongoHasData && !fileHasData) {
    return mongoData;
  }

  if (!mongoHasData && fileHasData) {
    return fileData;
  }

  if (!mongoHasData && !fileHasData) {
    return mongoData;
  }

  return {
    source: 'hybrid',
    stats: {
      totalArticles: pickPreferredCount(
        mongoData.stats.totalArticles,
        fileData.stats.totalArticles
      ),
      totalVideos: pickPreferredCount(
        mongoData.stats.totalVideos,
        fileData.stats.totalVideos
      ),
      totalEPapers: pickPreferredCount(
        mongoData.stats.totalEPapers,
        fileData.stats.totalEPapers
      ),
      newMessages: pickPreferredCount(
        mongoData.stats.newMessages,
        fileData.stats.newMessages
      ),
    },
    inbox: {
      all: pickPreferredCount(mongoData.inbox.all, fileData.inbox.all),
      new: pickPreferredCount(mongoData.inbox.new, fileData.inbox.new),
      inProgress: pickPreferredCount(
        mongoData.inbox.inProgress,
        fileData.inbox.inProgress
      ),
      resolved: pickPreferredCount(
        mongoData.inbox.resolved,
        fileData.inbox.resolved
      ),
    },
    popularArticles: pickPreferredList(
      mongoData.popularArticles,
      fileData.popularArticles
    ),
    recentArticles: pickPreferredList(
      mongoData.recentArticles,
      fileData.recentArticles
    ),
    recentVideos: pickPreferredList(
      mongoData.recentVideos,
      fileData.recentVideos
    ),
  };
}
