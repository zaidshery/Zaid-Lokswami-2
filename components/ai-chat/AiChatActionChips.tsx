'use client';

import type { AiChatActionTab } from './types';

type AiChatActionChipsProps = {
  activeTab: AiChatActionTab;
  language: 'hi' | 'en';
  onTabChange: (tab: AiChatActionTab) => void;
  isLight: boolean;
};

const CHAT_TABS: Record<'hi' | 'en', Array<{ id: AiChatActionTab; label: string }>> = {
  hi: [
    { id: 'search', label: 'खोजें' },
    { id: 'summary', label: 'सारांश' },
    { id: 'listen', label: 'सुनें' },
    { id: 'headlines', label: 'हेडलाइंस' },
  ],
  en: [
    { id: 'search', label: 'Search' },
    { id: 'summary', label: 'Summary' },
    { id: 'listen', label: 'Listen' },
    { id: 'headlines', label: 'Headlines' },
  ],
};

export default function AiChatActionChips({
  activeTab,
  language,
  onTabChange,
  isLight,
}: AiChatActionChipsProps) {
  const tabs = CHAT_TABS[language] || CHAT_TABS.en;

  return (
    <div
      className={`relative z-10 flex-shrink-0 border-b ${
        isLight
          ? 'border-red-200/80 bg-[linear-gradient(180deg,#fff,#fff7f7)]'
          : 'border-red-500/25 bg-[linear-gradient(180deg,rgba(17,24,39,0.88),rgba(9,9,11,0.98))]'
      }`}
    >
      <div className="scrollbar-hide overflow-x-auto">
        <div className="flex gap-2 px-4 py-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex-shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'border-red-400/70 bg-[linear-gradient(135deg,#fb7185,#dc2626_56%,#991b1b)] text-white shadow-[0_10px_20px_rgba(127,29,29,0.45)]'
                    : isLight
                      ? 'border-red-100 bg-white text-zinc-700 hover:border-red-300 hover:text-red-600'
                      : 'border-zinc-700/70 bg-zinc-900/80 text-zinc-300 hover:border-red-500/40 hover:text-red-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
