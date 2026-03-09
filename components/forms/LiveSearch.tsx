'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/lib/store/appStore';
import Link from 'next/link';

const trendingSearches = {
  hi: ['IPL 2024', 'लोकसभा चुनाव', 'मौसम अपडेट', 'सोने का भाव', 'पेट्रोल डीजल'],
  en: ['IPL 2024', 'Lok Sabha Election', 'Weather Update', 'Gold Price', 'Petrol Diesel'],
};

const recentSearches = {
  hi: ['बजट 2024', 'क्रिकेट', 'बॉलीवुड'],
  en: ['Budget 2024', 'Cricket', 'Bollywood'],
};

export default function LiveSearch() {
  const { language } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/main/search?q=${encodeURIComponent(query)}`;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-full bg-lokswami-surface border border-lokswami-border flex items-center justify-center text-lokswami-text-secondary hover:text-lokswami-white hover:border-lokswami-red transition-all"
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 md:pt-32"
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-2xl mx-4"
            >
              {/* Search Input */}
              <form onSubmit={handleSearch} className="relative">
                <div className="flex items-center bg-lokswami-surface border border-lokswami-border rounded-2xl overflow-hidden focus-within:border-lokswami-red transition-colors">
                  <Search className="w-5 h-5 text-lokswami-text-muted ml-4" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={language === 'hi' ? 'खबरें खोजें...' : 'Search news...'}
                    className="flex-1 bg-transparent px-4 py-4 text-lokswami-white placeholder:text-lokswami-text-muted focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="p-2 text-lokswami-text-muted hover:text-lokswami-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-4 text-lokswami-text-muted hover:text-lokswami-white border-l border-lokswami-border"
                  >
                    {language === 'hi' ? 'बंद' : 'Close'}
                  </button>
                </div>
              </form>

              {/* Search Suggestions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-4 bg-lokswami-surface border border-lokswami-border rounded-2xl overflow-hidden"
              >
                {/* Trending Searches */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-lokswami-text-secondary mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {language === 'hi' ? 'ट्रेंडिंग' : 'Trending'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trendingSearches[language].map((term, index) => (
                      <Link
                        key={index}
                        href={`/main/search?q=${encodeURIComponent(term)}`}
                        className="px-3 py-1.5 bg-lokswami-black rounded-full text-sm text-lokswami-text-secondary hover:text-lokswami-white hover:bg-lokswami-red/20 transition-colors"
                      >
                        {term}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Recent Searches */}
                <div className="p-4 border-t border-lokswami-border">
                  <h3 className="text-sm font-semibold text-lokswami-text-secondary mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {language === 'hi' ? 'हाल की खोज' : 'Recent'}
                  </h3>
                  <div className="space-y-1">
                    {recentSearches[language].map((term, index) => (
                      <Link
                        key={index}
                        href={`/main/search?q=${encodeURIComponent(term)}`}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-lokswami-black transition-colors group"
                      >
                        <span className="text-sm text-lokswami-text-secondary group-hover:text-lokswami-white">
                          {term}
                        </span>
                        <ArrowRight className="w-4 h-4 text-lokswami-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
