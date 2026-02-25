'use client';

import React from 'react';
import { TrendingUp, ArrowRight } from 'lucide-react';
import HeroCarousel from '@/app/components/content/HeroCarousel';
import StoriesRail from '@/app/components/content/StoriesRail';
import NewsCard from '@/app/components/content/NewsCard';
import { articles, stories } from '@/lib/mock/data';

export default function HomePage() {
  // Split articles for different sections
  const heroArticles = articles.slice(0, 5);
  const latestNews = articles.slice(5, 12);
  const trendingArticles = articles.filter(article => article.isTrending);
  const featuredSidebar = trendingArticles.slice(0, 5);

  return (
    <div className="space-y-12 pb-12">
      {/* 1. Hero Section - Full Width Impact */}
      <section className="w-full">
        <HeroCarousel articles={heroArticles} />
      </section>

      {/* 2. Visual Stories - Interactive Rail */}
      <section className="w-full">
        <StoriesRail stories={stories} />
      </section>

      {/* 3. Main Content Grid - Mixed Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left Column: Latest News (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary-600 rounded-full"></span>
              Latest News
            </h2>
            <button className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {latestNews.map((article, index) => (
              <NewsCard 
                key={article.id} 
                article={article} 
                variant="horizontal" 
                index={index}
              />
            ))}
          </div>
          
          {/* Load More Button */}
          <div className="pt-4 flex justify-center">
            <button className="px-8 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-full transition-all active:scale-95">
              Load More Stories
            </button>
          </div>
        </div>

        {/* Right Column: Trending & Sidebar (4 cols) */}
        <aside className="lg:col-span-4 space-y-10">
          
          {/* Trending Section */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Trending Now</h3>
            </div>
            
            <div className="flex flex-col gap-4">
              {featuredSidebar.map((article, index) => (
                <NewsCard 
                  key={article.id} 
                  article={article} 
                  variant="compact" 
                  index={index}
                />
              ))}
            </div>
          </div>

          {/* Newsletter / Ad Placeholder */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-900 to-gray-900 p-8 text-center text-white shadow-lg">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary-500 rounded-full blur-3xl opacity-20"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
            
            <h3 className="relative text-xl font-bold mb-2">Subscribe to Lokswami</h3>
            <p className="relative text-gray-300 text-sm mb-6">Get the latest news delivered straight to your inbox daily.</p>
            
            <div className="relative flex flex-col gap-3">
              <input type="email" placeholder="Your email address" className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button className="w-full px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition-colors">
                Subscribe
              </button>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}