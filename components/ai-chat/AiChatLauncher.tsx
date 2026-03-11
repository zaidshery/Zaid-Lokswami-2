'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Flame, MapPin, Newspaper, Send, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const chat = useAiChat({ isOpen: sheetOpen });
  const { theme, language } = useAppStore();
  const isLight = theme === 'light';
  const isHindi = language === 'hi';

  const content = useMemo(
    () => ({
      title: 'Lokswami AI Assistant',
      subtitle: isHindi ? 'लाइव न्यूज़ अपडेट्स' : 'Live news updates',
      intro: isHindi
        ? 'नमस्ते! मैं आपकी खबरों में मदद कर सकती हूं।'
        : "Namaste! I can help with today's news.",
      inputHint: isHindi ? 'अपने सवाल टाइप करें...' : 'Type your question...',
      prompts: isHindi
        ? [
            {
              id: 'latest',
              label: 'आज की ताज़ा खबरें',
              value: 'आज की ताज़ा खबरें बताइए',
              Icon: Flame,
            },
            {
              id: 'city',
              label: 'मेरे शहर की खबर',
              value: 'मेरे शहर की खबरें बताइए',
              Icon: MapPin,
            },
            {
              id: 'epaper',
              label: 'ई-पेपर खोलें',
              value: 'आज का ई-पेपर खोलो',
              Icon: Newspaper,
            },
          ]
        : [
            {
              id: 'latest',
              label: 'Today top stories',
              value: 'Show me today top news',
              Icon: Flame,
            },
            {
              id: 'city',
              label: 'My city updates',
              value: 'Show me news from my city',
              Icon: MapPin,
            },
            {
              id: 'epaper',
              label: 'Open e-paper',
              value: 'Open today e-paper',
              Icon: Newspaper,
            },
          ],
    }),
    [isHindi]
  );

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

  const handleOpenWithDraft = (value?: string) => {
    if (value) {
      chat.setDraft(value);
    }
    setSheetOpen(true);
  };

  const floatingButtonClassName = sheetOpen
    ? `${isLight ? 'border border-zinc-200 bg-white text-zinc-900' : 'border border-red-500/30 bg-zinc-900 text-zinc-100'} h-14 w-14 rounded-2xl xl:h-12 xl:w-12 xl:px-0`
    : 'h-14 w-14 rounded-2xl bg-gradient-to-br from-[#e63946] to-[#c1121f] text-white shadow-[0_16px_34px_rgba(230,57,70,0.42)] xl:h-12 xl:w-auto xl:px-5';

  const previewSurfaceClassName = isLight
    ? 'border-red-200/80 bg-[linear-gradient(165deg,rgba(255,255,255,0.96),rgba(254,242,242,0.95))] text-zinc-900 shadow-[0_18px_48px_rgba(127,29,29,0.16)]'
    : 'border-red-500/30 bg-[linear-gradient(165deg,rgba(9,9,11,0.94),rgba(24,24,27,0.96))] text-zinc-100 shadow-[0_22px_56px_rgba(0,0,0,0.55),0_0_24px_rgba(239,68,68,0.22)]';

  return (
    <ChatPortal>
      <AnimatePresence>
        {!sheetOpen && !previewDismissed ? (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.26, ease: 'easeOut' }}
            className={`fixed bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+4.3rem)] right-2 z-50 w-[calc(100vw-1rem)] max-w-[23.5rem] overflow-hidden rounded-[1.4rem] border backdrop-blur xl:bottom-[7.2rem] xl:right-6 xl:max-w-[27rem] ${previewSurfaceClassName}`}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-red-400/80 to-transparent" />
            <span className="pointer-events-none absolute -left-16 bottom-6 h-24 w-24 rounded-full bg-red-500/18 blur-2xl" />
            <span className="pointer-events-none absolute -right-16 top-8 h-24 w-24 rounded-full bg-orange-500/16 blur-2xl" />

            <div className="relative px-4 pb-4 pt-3">
              <button
                type="button"
                onClick={() => setPreviewDismissed(true)}
                aria-label={isHindi ? 'AI प्रीव्यू बंद करें' : 'Close AI preview'}
                className={`absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                  isLight
                    ? 'border-zinc-300 bg-white text-zinc-600 hover:border-red-400 hover:text-red-600'
                    : 'border-red-500/45 bg-zinc-950/90 text-zinc-300 hover:border-red-400 hover:text-red-200'
                }`}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-3 flex items-center gap-3">
                <AiChatBrandMark
                  compact
                  pulse
                  className="h-11 w-11 md:h-12 md:w-12"
                  imageScale={1.45}
                  imagePosition="50% 40%"
                />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{content.title}</p>
                  <p className={isLight ? 'text-[11px] text-red-600' : 'text-[11px] text-red-300'}>
                    {content.subtitle}
                  </p>
                </div>
              </div>

              <p className={`text-sm font-semibold ${isLight ? 'text-zinc-800' : 'text-zinc-100'}`}>
                {content.intro}
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2">
                {content.prompts.map(({ id, label, value, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleOpenWithDraft(value)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                      isLight
                        ? 'border-red-200 bg-white/90 text-zinc-700 hover:border-red-400 hover:text-red-600'
                        : 'border-red-500/35 bg-zinc-900/80 text-zinc-200 hover:border-red-400/60 hover:text-red-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleOpenWithDraft()}
                className={`mt-3 flex w-full items-center justify-between rounded-full border px-4 py-2.5 text-left text-sm transition ${
                  isLight
                    ? 'border-red-300 bg-white text-zinc-500 hover:border-red-500'
                    : 'border-red-500/45 bg-zinc-950/90 text-zinc-400 hover:border-red-400'
                }`}
              >
                <span className="truncate">{content.inputHint}</span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_8px_18px_rgba(185,28,28,0.44)]">
                  <Send className="h-3.5 w-3.5" />
                </span>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handleToggle}
        aria-label={sheetOpen ? 'Close Lokswami AI Assistant' : 'Open Lokswami AI Assistant'}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.9rem)] right-4 z-[51] inline-flex items-center justify-center gap-2 overflow-hidden transition-transform xl:bottom-8 xl:right-6 ${floatingButtonClassName}`}
      >
        {sheetOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <AiChatBrandMark
              compact
              plain
              className="h-10 w-10 md:h-10 md:w-10 xl:h-9 xl:w-9"
              imageScale={1.55}
              imagePosition="50% 40%"
            />
            <span className="hidden whitespace-nowrap text-sm font-semibold tracking-wide text-white xl:inline">
              ✦ लो AI
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
