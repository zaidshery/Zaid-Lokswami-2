'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bot, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import AiChatBrandMark from './AiChatBrandMark';
import AiChatSheet from './AiChatSheet';
import { useAiChat } from './useAiChat';
import { useAppStore } from '@/lib/store/appStore';

type ChatPortalProps = {
  children: ReactNode;
};

function ChatPortal({ children }: ChatPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}

export default function AiChatLauncher() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const chat = useAiChat({ isOpen: sheetOpen });
  const { theme } = useAppStore();
  const isLight = theme === 'light';

  const handleToggle = () => {
    if (sheetOpen) {
      chat.stopListening();
      setSheetOpen(false);
      return;
    }

    setSheetOpen(true);
  };

  const handleClose = () => {
    chat.stopListening();
    setSheetOpen(false);
  };

  const buttonClassName = sheetOpen
    ? `${isLight ? 'border border-zinc-200 bg-white text-zinc-900 shadow-black/10' : 'bg-zinc-800 text-white shadow-black/35'} bottom-[88px] h-14 w-14 rounded-2xl shadow-xl md:bottom-24 md:h-12 md:w-12 xl:bottom-8 xl:right-6`
    : `${isLight ? 'border border-red-300/70 bg-[linear-gradient(145deg,#ef4444,#b91c1c_72%,#881337)] text-white shadow-[0_20px_40px_rgba(153,27,27,0.28)]' : 'border border-red-500/28 bg-[linear-gradient(145deg,#ef4444,#b91c1c_72%,#7f1d1d)] text-white shadow-[0_22px_42px_rgba(127,29,29,0.45)]'} bottom-[88px] h-14 w-14 rounded-full md:bottom-24 md:h-14 md:w-14 xl:bottom-8 xl:right-6 xl:h-[3.75rem] xl:w-auto xl:min-w-[10.75rem] xl:rounded-full xl:border-red-500/18 xl:bg-zinc-950/96 xl:shadow-[0_20px_48px_rgba(0,0,0,0.35)] xl:px-3`;

  return (
    <ChatPortal>
      <motion.button
        type="button"
        onClick={handleToggle}
        aria-label={sheetOpen ? 'Close Lokswami AI chat' : 'Open Lokswami AI chat'}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={`fixed right-4 z-50 inline-flex items-center justify-center overflow-hidden transition-transform ${buttonClassName}`}
      >
        {sheetOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <span
              className={`pointer-events-none absolute inset-0 ${
                isLight
                  ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0))]'
                  : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))]'
              }`}
            />
            <span className="pointer-events-none absolute inset-[1px] rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />

            <span className="relative flex items-center justify-center xl:hidden">
              <Bot className="h-5 w-5 drop-shadow-[0_2px_10px_rgba(0,0,0,0.22)]" />
            </span>

            <span className="relative hidden items-center gap-3 xl:flex">
              <AiChatBrandMark compact />
              <span className="min-w-0 text-left">
                <span
                  className={`block text-[11px] font-semibold uppercase tracking-[0.24em] ${
                    isLight ? 'text-red-600' : 'text-red-300'
                  }`}
                >
                  Lokswami
                </span>
                <span
                  className={`block text-sm font-semibold ${
                    isLight ? 'text-zinc-950' : 'text-white'
                  }`}
                >
                  AI Desk
                </span>
              </span>
            </span>
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {sheetOpen ? (
          <AiChatSheet
            open={sheetOpen}
            onClose={handleClose}
            chat={chat}
            theme={theme}
          />
        ) : null}
      </AnimatePresence>
    </ChatPortal>
  );
}
