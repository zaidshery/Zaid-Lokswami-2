'use client';

import { useEffect, useRef } from 'react';
import AiChatActionChips from './AiChatActionChips';
import AiChatComposer from './AiChatComposer';
import AiChatHeader from './AiChatHeader';
import AiChatMessages from './AiChatMessages';
import type { UseAiChatResult } from './types';

type AiChatSheetProps = {
  open: boolean;
  onClose: () => void;
  chat: UseAiChatResult;
};

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute('disabled'));
}

export default function AiChatSheet({ open, onClose, chat }: AiChatSheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    const previousActive = document.activeElement as HTMLElement | null;
    const focusable = getFocusableElements(panel);
    (focusable[0] || panel).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const items = getFocusableElements(panel);
      if (!items.length) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousActive?.focus();
    };
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-[120] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <button
        type="button"
        aria-label="Close AI chat"
        onClick={onClose}
        className={`absolute inset-0 bg-black/65 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Lokswami AI Chat"
        tabIndex={-1}
        className={[
          'absolute inset-x-0 bottom-0 flex h-[70vh] max-h-[70vh] flex-col overflow-hidden rounded-t-3xl border border-[#262626] bg-[#151515] shadow-2xl outline-none transition duration-200',
          'sm:inset-x-auto sm:right-4 sm:h-[78vh] sm:max-h-[760px] sm:w-[min(92vw,420px)] sm:rounded-2xl sm:bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1rem)]',
          'lg:bottom-6',
          open ? 'translate-y-0 opacity-100 sm:translate-x-0' : 'translate-y-8 opacity-0 sm:translate-x-6',
        ].join(' ')}
      >
        <AiChatHeader isWorking={chat.isWorking} onClose={onClose} />

        <AiChatActionChips
          language={chat.language}
          isWorking={chat.isWorking}
          draft={chat.draft}
          currentArticleId={chat.currentArticleId}
          searchRouteHref={chat.searchRouteHref}
          onSearch={chat.runDraftSearch}
          onSummary={chat.runSummaryAction}
          onListen={() => {
            void chat.handleListen();
          }}
          onTopHeadlines={chat.runTopHeadlines}
          isPreparingListen={chat.isPreparingListen}
        />

        <AiChatMessages
          language={chat.language}
          messages={chat.messages}
          isWorking={chat.isWorking}
          errorText={chat.errorText}
          messagesEndRef={chat.messagesEndRef}
        />

        <AiChatComposer
          draft={chat.draft}
          setDraft={chat.setDraft}
          isWorking={chat.isWorking}
          onSend={chat.sendMessage}
          listenLanguageCode={chat.listenLanguageCode}
          setListenLanguageCode={chat.setListenLanguageCode}
          listenLanguageOptions={chat.listenLanguageOptions}
          onListen={() => {
            void chat.handleListen();
          }}
          onStop={chat.stopListening}
          isPreparingListen={chat.isPreparingListen}
          isPlayingAudio={chat.isPlayingAudio}
          listenError={chat.listenError}
        />
      </div>
    </div>
  );
}
