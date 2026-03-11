'use client';

import { ArrowLeft, ChevronDown, X } from 'lucide-react';
import AiChatBrandMark from './AiChatBrandMark';

type ViewportMode = 'mobile' | 'tablet' | 'desktop';

type AiChatHeaderProps = {
  viewportMode: ViewportMode;
  language: 'hi' | 'en';
  isLight: boolean;
  onMinimize: () => void;
  onClose: () => void;
};

export default function AiChatHeader({
  viewportMode,
  language,
  isLight,
  onMinimize,
  onClose,
}: AiChatHeaderProps) {
  const isMobile = viewportMode === 'mobile';
  const title = 'Lokswami AI Assistant';
  const statusLabel = language === 'hi' ? 'लाइव न्यूज़ अपडेट्स' : 'Live news updates';

  const headerClassName = `${
    isLight
      ? 'border-red-200 bg-[linear-gradient(180deg,rgba(248,113,113,0.14),rgba(255,255,255,0.97))]'
      : 'border-red-500/30 bg-[linear-gradient(180deg,rgba(127,29,29,0.38),rgba(9,9,11,0.98))]'
  } relative z-10 flex h-16 flex-shrink-0 items-center justify-between border-b px-4 ${
    isMobile ? '' : 'rounded-t-[1.9rem]'
  }`;
  const iconButtonClassName = `${
    isLight
      ? 'border border-zinc-300 bg-zinc-100 text-zinc-600 hover:border-red-300 hover:text-red-600'
      : 'border border-red-500/35 bg-zinc-900/85 text-zinc-300 hover:border-red-400/60 hover:text-red-200'
  } inline-flex h-8 w-8 items-center justify-center rounded-xl transition`;
  const closeButtonClassName = `${
    isLight
      ? 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
      : 'border border-red-500/45 bg-red-500/12 text-red-200 hover:bg-red-500/20'
  } inline-flex h-8 w-8 items-center justify-center rounded-xl transition`;

  return (
    <header className={headerClassName}>
      <div className="flex min-w-0 items-center gap-3">
        {isMobile ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to page"
            className={closeButtonClassName}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}

        <AiChatBrandMark
          compact
          pulse
          className="h-11 w-11 md:h-12 md:w-12"
          imageScale={1.45}
          imagePosition="50% 40%"
        />

        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold ${isLight ? 'text-zinc-900' : 'text-white'}`}>
            {title}
          </p>
          <p className={`mt-1 text-xs ${isLight ? 'text-red-700' : 'text-red-400'}`}>
            {statusLabel}
          </p>
        </div>
      </div>

      {!isMobile ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMinimize}
            aria-label="Minimize AI chat"
            className={iconButtonClassName}
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI chat"
            className={closeButtonClassName}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </header>
  );
}
