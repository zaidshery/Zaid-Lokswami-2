'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Edit,
  FileText,
  Loader,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Volume2,
} from 'lucide-react';
import { getAuthHeader } from '@/lib/auth/clientToken';
import { NEWS_CATEGORIES } from '@/lib/constants/newsCategories';
import { formatUiDate } from '@/lib/utils/dateFormat';

interface Article {
  _id: string;
  title: string;
  summary: string;
  category: string;
  author: string;
  publishedAt: string;
  views: number;
  isBreaking: boolean;
  isTrending: boolean;
}

type TtsVariant = 'breaking_headline' | 'article_full';
type TtsStatus = 'pending' | 'ready' | 'failed' | 'stale';

type TtsAssetRecord = {
  _id: string;
  sourceId: string;
  variant: TtsVariant;
  status: TtsStatus;
  audioUrl?: string;
  lastError?: string;
};

type TtsAssetsResponse = {
  success?: boolean;
  data?: {
    assets?: TtsAssetRecord[];
  };
};

const FILTER_CATEGORIES = ['all', ...NEWS_CATEGORIES.map((category) => category.nameEn)];

function TtsPill({
  label,
  tone,
}: {
  label: string;
  tone: 'ready' | 'warning' | 'error' | 'neutral';
}) {
  const toneClass =
    tone === 'ready'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-gray-200 bg-gray-100 text-gray-600';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${toneClass}`}
    >
      {label}
    </span>
  );
}

export default function ArticlesManagement() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [articleTtsById, setArticleTtsById] = useState<
    Record<string, Partial<Record<TtsVariant, TtsAssetRecord>>>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [runningTtsActionKey, setRunningTtsActionKey] = useState('');
  const [error, setError] = useState('');

  const loadTtsAssets = useCallback(async (nextArticles: Article[]) => {
    if (!nextArticles.length) {
      setArticleTtsById({});
      return;
    }

    try {
      const params = new URLSearchParams({
        sourceType: 'article',
        sourceIds: nextArticles.map((article) => article._id).join(','),
        limit: 'all',
      });
      const response = await fetch(`/api/admin/tts/assets?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = (await response.json().catch(() => ({}))) as TtsAssetsResponse;
      if (!response.ok || !data.success || !Array.isArray(data.data?.assets)) {
        return;
      }

      const nextMap: Record<string, Partial<Record<TtsVariant, TtsAssetRecord>>> = {};
      for (const asset of data.data.assets) {
        if (!nextMap[asset.sourceId]) {
          nextMap[asset.sourceId] = {};
        }
        if (!nextMap[asset.sourceId][asset.variant]) {
          nextMap[asset.sourceId][asset.variant] = asset;
        }
      }

      setArticleTtsById(nextMap);
    } catch {
      // Keep the list usable even if TTS status fails to load.
    }
  }, []);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/articles?limit=all');
      const data = await response.json();

      if (data.success) {
        const nextArticles = (data.data || []) as Article[];
        setArticles(nextArticles);
        setFilteredArticles(nextArticles);
        await loadTtsAssets(nextArticles);
      }
    } catch {
      setError('Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  }, [loadTtsAssets]);

  useEffect(() => {
    void fetchArticles();
  }, [fetchArticles]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/articles/${id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeader(),
        },
      });

      if (response.ok) {
        setArticles((current) => current.filter((article) => article._id !== id));
        setFilteredArticles((current) => current.filter((article) => article._id !== id));
        setArticleTtsById((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        setDeleteConfirm(null);
      }
    } catch {
      setError('Failed to delete article');
    }
  };

  useEffect(() => {
    let filtered = articles;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((article) => article.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredArticles(filtered);
  }, [searchTerm, selectedCategory, articles]);

  const getTtsState = (articleId: string, variant: TtsVariant) => {
    return articleTtsById[articleId]?.[variant] || null;
  };

  const handleGenerateTts = async (article: Article, variant: TtsVariant) => {
    const actionKey = `${variant}:${article._id}`;
    setRunningTtsActionKey(actionKey);
    setError('');

    try {
      const endpoint =
        variant === 'breaking_headline'
          ? `/api/admin/articles/${encodeURIComponent(article._id)}/breaking-tts?force=1`
          : `/api/admin/articles/${encodeURIComponent(article._id)}/tts?force=1`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
      });
      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update TTS audio');
      }

      await loadTtsAssets(articles);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Failed to update TTS audio'
      );
    } finally {
      setRunningTtsActionKey('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Articles</h1>
          <p className="mt-1 text-gray-600">Manage and edit your articles</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/ai?ttsVariant=article_full&ttsSourceType=article"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Article TTS Ops
          </Link>
          <Link
            href="/admin/ai?ttsVariant=breaking_headline&ttsSourceType=article"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Breaking TTS Ops
          </Link>
          <Link href="/admin/articles/new">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-lg bg-spanish-red px-6 py-3 font-medium text-white transition-colors hover:bg-guardsman-red"
            >
              <Plus className="h-5 w-5" />
              New Article
            </motion.button>
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-spanish-red focus:outline-none"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-spanish-red focus:outline-none"
          >
            {FILTER_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-6 w-6 animate-spin text-spanish-red" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <FileText className="mx-auto mb-3 h-12 w-12 text-gray-400" />
            <p className="text-gray-600">No articles found</p>
          </div>
        ) : (
          filteredArticles.map((article, idx) => {
            const listenAsset = getTtsState(article._id, 'article_full');
            const breakingAsset = getTtsState(article._id, 'breaking_headline');
            const listenTone =
              listenAsset?.status === 'ready'
                ? 'ready'
                : listenAsset?.status === 'stale'
                  ? 'warning'
                  : listenAsset?.status === 'failed'
                    ? 'error'
                    : 'neutral';
            const breakingTone =
              breakingAsset?.status === 'ready'
                ? 'ready'
                : breakingAsset?.status === 'stale'
                  ? 'warning'
                  : breakingAsset?.status === 'failed'
                    ? 'error'
                    : 'neutral';

            return (
              <motion.div
                key={article._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="truncate text-lg font-semibold text-gray-900">{article.title}</h3>
                      {article.isBreaking ? (
                        <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                          Breaking
                        </span>
                      ) : null}
                      {article.isTrending ? (
                        <span className="rounded bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
                          Trending
                        </span>
                      ) : null}
                    </div>
                    <p className="mb-2 line-clamp-1 text-sm text-gray-600">{article.summary}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>By {article.author}</span>
                      <span>|</span>
                      <span>{article.category}</span>
                      <span>|</span>
                      <span>{formatUiDate(article.publishedAt, article.publishedAt)}</span>
                      <span>|</span>
                      <span>{article.views} views</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <TtsPill
                        label={`Listen ${listenAsset?.status || 'missing'}`}
                        tone={listenTone}
                      />
                      {article.isBreaking ? (
                        <TtsPill
                          label={`Breaking voice ${breakingAsset?.status || 'missing'}`}
                          tone={breakingTone}
                        />
                      ) : (
                        <TtsPill label="Breaking voice off" tone="neutral" />
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleGenerateTts(article, 'article_full')}
                        disabled={runningTtsActionKey !== ''}
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {runningTtsActionKey === `article_full:${article._id}` ? (
                          <Loader className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                        {listenAsset?.audioUrl ? 'Regenerate Listen' : 'Generate Listen'}
                      </button>
                      {article.isBreaking ? (
                        <button
                          type="button"
                          onClick={() => void handleGenerateTts(article, 'breaking_headline')}
                          disabled={runningTtsActionKey !== ''}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {runningTtsActionKey === `breaking_headline:${article._id}` ? (
                            <Loader className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          {breakingAsset?.audioUrl ? 'Regenerate Breaking' : 'Generate Breaking'}
                        </button>
                      ) : null}
                      <Link
                        href={`/admin/ai?ttsSourceType=article&ttsSourceId=${encodeURIComponent(article._id)}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        TTS Ops
                      </Link>
                    </div>

                    {listenAsset?.lastError ? (
                      <p className="mt-2 text-xs text-red-600">{listenAsset.lastError}</p>
                    ) : null}
                    {!listenAsset?.lastError && article.isBreaking && breakingAsset?.lastError ? (
                      <p className="mt-2 text-xs text-red-600">{breakingAsset.lastError}</p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/admin/articles/${article._id}/edit`}>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </motion.button>
                    </Link>

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setDeleteConfirm(article._id)}
                      className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>

                {deleteConfirm === article._id ? (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3"
                  >
                    <p className="text-sm text-red-800">
                      Are you sure you want to delete this article?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleDelete(article._id)}
                        className="rounded bg-red-600 px-3 py-1 text-sm text-white transition-colors hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded bg-gray-300 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
