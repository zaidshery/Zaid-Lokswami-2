'use client';

import { Bot } from 'lucide-react';

type AiChatBrandMarkProps = {
  compact?: boolean;
};

export default function AiChatBrandMark({
  compact = false,
}: AiChatBrandMarkProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-red-400/30 bg-[linear-gradient(145deg,#ef4444,#b91c1c_72%,#881337)] text-white shadow-[0_12px_24px_rgba(153,27,27,0.26)] ${
        compact ? 'h-10 w-10' : 'h-11 w-11'
      }`}
    >
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0))]" />
      <span className="pointer-events-none absolute inset-x-2 top-1.5 h-3 rounded-full bg-white/20 blur-sm" />
      <Bot className={`${compact ? 'h-4 w-4' : 'h-[18px] w-[18px]'} relative z-10`} />
    </span>
  );
}
