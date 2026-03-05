'use client';

import Image from 'next/image';
import { MessageCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AiChatSheet from './AiChatSheet';
import { useAiChat } from './useAiChat';

const SHEET_EXIT_MS = 220;

export default function AiChatLauncher() {
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chat = useAiChat({ isOpen: sheetOpen });

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const openSheet = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (!sheetMounted) {
      setSheetMounted(true);
      requestAnimationFrame(() => {
        setSheetOpen(true);
      });
      return;
    }

    setSheetOpen(true);
  };

  const closeSheet = () => {
    chat.stopListening();
    setSheetOpen(false);

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = setTimeout(() => {
      setSheetMounted(false);
    }, SHEET_EXIT_MS);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (sheetOpen) {
            closeSheet();
            return;
          }
          openSheet();
        }}
        aria-label={sheetOpen ? 'Close Lokswami AI chat' : 'Open Lokswami AI chat'}
        className="fixed bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] right-3 z-[121] inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#262626] bg-[#151515] text-[#EAEAEA] shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition duration-200 hover:scale-[1.02] hover:border-[#E11D2E] hover:text-white lg:bottom-6 lg:right-6"
      >
        <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-[#E11D2E]/35" />
        <span className="relative h-7 w-7 overflow-hidden rounded-full border border-[#262626]">
          <Image src="/logo-icon-final.png" alt="Lokswami" fill sizes="28px" className="object-cover" />
        </span>
        <MessageCircle className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-[#E11D2E] p-0.5 text-white" />
      </button>

      {sheetMounted ? <AiChatSheet open={sheetOpen} onClose={closeSheet} chat={chat} /> : null}
    </>
  );
}
