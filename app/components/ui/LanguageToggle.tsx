'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store/appStore';

export interface LanguageToggleProps {
  compact?: boolean;
}

export default function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { language, toggleLanguage } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (compact) {
    return (
      <motion.button
        onClick={toggleLanguage}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 transition-all duration-200 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        aria-label={language === 'hi' ? 'Switch to English' : 'Switch to Hindi'}
      >
        <span
          className={`transition-all font-bold ${
            language === 'hi'
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {'\u0939\u093f'}
        </span>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span
          className={`transition-all font-bold ${
            language === 'en'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          EN
        </span>
      </motion.button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      className="relative flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 transition-all duration-200 hover:scale-105 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      aria-label={language === 'hi' ? 'Switch to English' : 'Switch to Hindi'}
    >
      <span
        className={`transition-all font-bold ${
          language === 'hi'
            ? 'text-base text-orange-600 dark:text-orange-400'
            : 'text-sm text-gray-500 dark:text-gray-400'
        }`}
      >
        {'\u0939\u093f'}
      </span>
      <span className="text-gray-300 dark:text-gray-600">|</span>
      <span
        className={`transition-all font-bold ${
          language === 'en'
            ? 'text-base text-blue-600 dark:text-blue-400'
            : 'text-sm text-gray-500 dark:text-gray-400'
        }`}
      >
        EN
      </span>
    </button>
  );
}
