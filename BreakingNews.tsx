'use client';

import React from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import Container from '@/app/components/common/Container';

// Temporary mock data - connect to your store/API later
const NEWS_ITEMS = [
  { id: 1, title: "Lokswami v2 launches with a brand new responsive design", slug: "lokswami-launch" },
  { id: 2, title: "Market Update: Sensex rises 500 points in early trade", slug: "market-update" },
  { id: 3, title: "Weather Alert: Heavy rainfall predicted for the next 24 hours", slug: "weather-alert" },
];

export default function BreakingNews() {
  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 relative z-40 transition-colors duration-300">
      <Container>
        <div className="flex items-center h-10 sm:h-11 overflow-hidden">
          {/* Label Badge */}
          <div className="flex-shrink-0 relative z-10 bg-primary-600 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-sm flex items-center gap-2 shadow-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            BREAKING
            {/* Triangle arrow for visual flair */}
            <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-l-[6px] border-l-primary-600 border-b-[6px] border-b-transparent"></div>
          </div>

          {/* Scrolling Ticker */}
          <div className="flex-1 overflow-hidden relative ml-4 mask-linear-fade group">
            <div className="animate-marquee whitespace-nowrap flex items-center group-hover:[animation-play-state:paused]">
              {NEWS_ITEMS.map((item) => (
                <span key={item.id} className="mx-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-2">
                  <Zap size={14} className="text-primary-600 dark:text-primary-500 fill-current opacity-80" />
                  <Link href={`/main/${item.slug}`}>
                    {item.title}
                  </Link>
                </span>
              ))}
              {/* Duplicate for seamless loop */}
              {NEWS_ITEMS.map((item) => (
                <span key={`dup-${item.id}`} className="mx-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-2">
                  <Zap size={14} className="text-primary-600 dark:text-primary-500 fill-current opacity-80" />
                  <Link href={`/main/${item.slug}`}>
                    {item.title}
                  </Link>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Container>
      
      <style jsx>{`
        .mask-linear-fade {
          mask-image: linear-gradient(to right, transparent, black 20px, black 95%, transparent);
        }
      `}</style>
    </div>
  );
}