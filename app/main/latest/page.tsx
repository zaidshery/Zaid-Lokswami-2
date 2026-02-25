'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Grid3X3, List, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store/appStore';
import { articles as mockArticles, type Article } from '@/lib/mock/data';
import NewsCard from '@/app/components/content/NewsCard';
import HeroCard from '@/app/components/content/HeroCard';
import { fetchMergedLiveArticles } from '@/lib/content/liveArticles';

const COPY = {
  en: {
    breadcrumb: 'Home',
    title: 'Latest News',
    subtitle: 'Fresh updates across all sections.',
    countLabel: 'articles',
    latest: 'Latest',
    popular: 'Popular',
    loadMore: 'Load More',
    empty: 'No articles found right now.',
  },
  hi: {
    breadcrumb: '\u0939\u094b\u092e',
    title: '\u0924\u093e\u091c\u093c\u093e \u0916\u092c\u0930\u0947\u0902',
    subtitle: '\u0938\u092d\u0940 \u0936\u094d\u0930\u0947\u0923\u093f\u092f\u094b\u0902 \u0915\u0940 \u0928\u0908 \u0905\u092a\u0921\u0947\u091f\u094d\u0938\u0964',
    countLabel: '\u0916\u092c\u0930\u0947\u0902',
    latest: '\u0924\u093e\u091c\u093c\u093e',
    popular: '\u0932\u094b\u0915\u092a\u094d\u0930\u093f\u092f',
    loadMore: '\u0914\u0930 \u0932\u094b\u0921 \u0915\u0930\u0947\u0902',
    empty: '\u0905\u092d\u0940 \u0915\u094b\u0908 \u0916\u092c\u0930 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964',
  },
};

export default function LatestNewsPage() {
  const { language } = useAppStore();
  const t = COPY[language];
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [articlesData, setArticlesData] = useState<Article[]>(mockArticles);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const merged = await fetchMergedLiveArticles(120);
      if (active) setArticlesData(merged);
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const sortedArticles = useMemo(() => {
    const next = [...articlesData];
    next.sort((a, b) => {
      if (sortBy === 'popular') return (b.views || 0) - (a.views || 0);
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
    return next;
  }, [articlesData, sortBy]);

  const heroArticle = sortedArticles[0];
  const otherArticles = sortedArticles.slice(1);

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-lokswami-text-muted">
        <span>{t.breadcrumb}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-lokswami-white">{t.title}</span>
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/15 text-red-500">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-lokswami-white">{t.title}</h1>
            <p className="text-sm text-lokswami-text-secondary">
              {sortedArticles.length} {t.countLabel} • {t.subtitle}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end sm:gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'latest' | 'popular')}
            className="min-w-[124px] rounded-lg border border-lokswami-border bg-lokswami-surface px-3 py-2 text-sm text-lokswami-white focus:border-lokswami-red focus:outline-none sm:min-w-[140px]"
          >
            <option value="latest">{t.latest}</option>
            <option value="popular">{t.popular}</option>
          </select>

          <div className="flex shrink-0 items-center rounded-lg border border-lokswami-border bg-lokswami-surface">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'text-lokswami-red' : 'text-lokswami-text-secondary hover:text-lokswami-white'}`}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'text-lokswami-red' : 'text-lokswami-text-secondary hover:text-lokswami-white'}`}
              aria-label="List view"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {heroArticle ? (
        <section>
          <HeroCard article={heroArticle} />
        </section>
      ) : null}

      {otherArticles.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {otherArticles.map((article, index) => (
              <NewsCard key={article.id} article={article} size="sm" index={index} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {otherArticles.map((article, index) => (
              <NewsCard key={article.id} article={article} variant="horizontal" index={index} />
            ))}
          </div>
        )
      ) : (
        <div className="rounded-xl border border-lokswami-border bg-lokswami-surface p-10 text-center text-lokswami-text-secondary">
          {t.empty}
        </div>
      )}

      {otherArticles.length > 0 ? (
        <div className="pt-4 text-center">
          <button className="rounded-full border border-lokswami-border bg-lokswami-surface px-8 py-3 text-lokswami-text-secondary transition-colors hover:border-lokswami-red hover:text-lokswami-white">
            {t.loadMore}
          </button>
        </div>
      ) : null}
    </div>
  );
}
