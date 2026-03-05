'use client';

import Image from 'next/image';
import { X } from 'lucide-react';

type AiChatHeaderProps = {
  isWorking: boolean;
  onClose: () => void;
};

export default function AiChatHeader({ isWorking, onClose }: AiChatHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#262626] bg-[#151515]/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative h-9 w-9 overflow-hidden rounded-full border border-[#262626] bg-black">
            <Image
              src="/logo-icon-final.png"
              alt="Lokswami"
              fill
              sizes="36px"
              className="object-cover"
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#EAEAEA]">Lokswami AI Chat</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
              {isWorking ? 'Online - Thinking' : 'Online'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI chat"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#262626] bg-[#0B0B0B] text-zinc-300 transition hover:border-zinc-600 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
