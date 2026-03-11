'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { RefObject } from 'react';
import AiChatBrandMark from './AiChatBrandMark';
import AiChatContentCards from './AiChatContentCards';
import type { AiCategorySuggestion, AiChatSuggestions, ChatMessage } from './types';

type AiChatMessagesProps = {
  language: 'hi' | 'en';
  messages: ChatMessage[];
  isWorking: boolean;
  errorText: string;
  messagesEndRef: RefObject<HTMLDivElement>;
  onSuggestionSelect: (value: string) => void;
  onQuickSearch: (value: string) => void;
  onRetrySearch: (value: string) => void;
  suggestions: AiChatSuggestions;
  isLoadingSuggestions: boolean;
  categorySuggestions: AiCategorySuggestion[];
  isLoadingCategorySuggestions: boolean;
  isLight: boolean;
};

const MESSAGE_ANIMATION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22 },
};

function getGreetingSeed(language: 'hi' | 'en') {
  return language === 'hi'
    ? 'नमस्ते, मैं लोकस्वामी AI हूं। आप खबर खोज सकते हैं, सारांश पा सकते हैं, या सुन सकते हैं।'
    : 'Hello, I am Lokswami AI. You can search news, get summaries, or listen here.';
}

function getEmptyStateSuggestions(language: 'hi' | 'en') {
  return language === 'hi'
    ? ['आज की बड़ी खबरें', 'IPL 2026 अपडेट', 'दिल्ली मौसम अपडेट']
    : ['Top stories today', 'IPL 2026 updates', 'Delhi weather update'];
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds < 1) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `0:${secs
    .toString()
    .padStart(2, '0')}`;
}

function AssistantAvatar() {
  return <AiChatBrandMark compact />;
}

function TypingIndicator({ isLight }: { isLight: boolean }) {
  const bubbleClassName = isLight
    ? 'border border-red-200 bg-red-50/80 text-zinc-800'
    : 'border border-red-500/25 bg-zinc-900/90 text-zinc-100';

  return (
    <div className={`rounded-2xl rounded-tl-sm px-4 py-3 ${bubbleClassName}`}>
      <div className="flex items-center gap-1 py-1">
        {[0, 0.2, 0.4].map((delay) => (
          <motion.span
            key={delay}
            className="h-2 w-2 rounded-full bg-red-400"
            animate={{ scale: [1, 1.45, 1] }}
            transition={{ repeat: Infinity, duration: 1, delay }}
          />
        ))}
      </div>
    </div>
  );
}

function ExploreMoreRow({
  language,
  isLight,
}: {
  language: 'hi' | 'en';
  isLight: boolean;
}) {
  const pillClassName = isLight
    ? 'rounded-full border border-red-200 bg-white px-3 py-1 text-xs text-zinc-700 transition hover:border-red-500 hover:text-red-600'
    : 'rounded-full border border-red-500/25 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 transition hover:border-red-500/55 hover:text-red-200';

  const labels =
    language === 'hi'
      ? { news: 'और खबरें', videos: 'वीडियो', epaper: 'ई-पेपर' }
      : { news: 'More news', videos: 'Videos', epaper: 'E-Paper' };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Link href="/main" className={pillClassName}>
        {labels.news}
      </Link>
      <Link href="/main/videos" className={pillClassName}>
        {labels.videos}
      </Link>
      <Link href="/main/epaper" className={pillClassName}>
        {labels.epaper}
      </Link>
    </div>
  );
}

function SuggestionsRail({
  language,
  suggestions,
  isLoading,
  isLight,
}: {
  language: 'hi' | 'en';
  suggestions: AiChatSuggestions;
  isLoading: boolean;
  isLight: boolean;
}) {
  const cards = [
    suggestions.latestEpaper,
    suggestions.trendingVideo,
    suggestions.topStory,
    suggestions.breakingArticle,
  ].filter((item): item is NonNullable<AiChatSuggestions[keyof AiChatSuggestions]> => item !== null);

  if (isLoading) {
    return (
      <div className="mt-5 w-full overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 pb-1">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`h-24 w-[220px] flex-shrink-0 animate-pulse rounded-2xl border ${
                isLight ? 'border-red-100 bg-red-50/70' : 'border-zinc-800 bg-zinc-900'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!cards.length) {
    return null;
  }

  return (
    <div className="mt-5 w-full">
      <p
        className={`mb-3 text-left text-[11px] font-semibold uppercase tracking-[0.15em] ${
          isLight ? 'text-zinc-600' : 'text-zinc-400'
        }`}
      >
        {language === 'hi' ? 'आज के सुझाव' : 'Live suggestions'}
      </p>

      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 pb-1">
          {cards.map((card) => {
            const cardClassName =
              card.type === 'epaper'
                ? isLight
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-amber-500/30 bg-amber-500/10'
                : card.type === 'video'
                  ? isLight
                    ? 'border-sky-300 bg-sky-50'
                    : 'border-sky-500/30 bg-sky-500/10'
                  : card.type === 'story'
                    ? isLight
                      ? 'border-fuchsia-300 bg-fuchsia-50'
                      : 'border-fuchsia-500/25 bg-fuchsia-500/10'
                    : isLight
                      ? 'border-red-200 bg-white'
                      : 'border-red-500/25 bg-zinc-900';

            return (
              <Link
                key={`${card.type}-${card.title}`}
                href={card.url}
                className={`flex h-24 w-[220px] flex-shrink-0 gap-3 rounded-2xl border p-3 text-left transition hover:scale-[1.02] ${cardClassName}`}
              >
                {card.thumbnail ? (
                  <div
                    className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl ${
                      card.type === 'story' ? 'aspect-square' : ''
                    }`}
                  >
                    <Image
                      src={card.thumbnail}
                      alt={card.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />

                    {card.type === 'story' ? (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="inline-flex rounded-full bg-red-500 p-2 text-white shadow-md shadow-red-500/30">
                            <span className="text-[10px] leading-none">▶</span>
                          </span>
                        </div>
                        {card.durationSeconds ? (
                          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {formatDuration(card.durationSeconds)}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-2xl">
                    {card.type === 'epaper' ? '📰' : card.type === 'article' ? '📢' : '⚡'}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[11px] font-semibold ${
                      card.type === 'story' ? 'text-fuchsia-400' : 'text-red-400'
                    }`}
                  >
                    {card.subtitle}
                  </p>
                  <p
                    className={`mt-1 line-clamp-2 text-sm font-semibold ${
                      isLight ? 'text-zinc-900' : 'text-zinc-100'
                    }`}
                  >
                    {card.title}
                  </p>
                  {card.date ? (
                    <p className="mt-2 text-[11px] text-zinc-500">{card.date.slice(0, 10)}</p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CategorySuggestionSection({
  language,
  categorySuggestions,
  isLoading,
  onQuickSearch,
  isLight,
}: {
  language: 'hi' | 'en';
  categorySuggestions: AiCategorySuggestion[];
  isLoading: boolean;
  onQuickSearch: (value: string) => void;
  isLight: boolean;
}) {
  if (isLoading) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`h-8 w-24 animate-pulse rounded-full ${
              isLight ? 'bg-zinc-200' : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>
    );
  }

  if (!categorySuggestions.length) {
    return null;
  }

  return (
    <div className="mt-3">
      <p className={`text-xs font-semibold ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
        {language === 'hi' ? 'आप ये भी पूछ सकते हैं' : 'Try these related topics'}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {categorySuggestions.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onQuickSearch(item.query)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              isLight
                ? 'border-red-200 bg-white text-zinc-700 hover:border-red-500 hover:text-red-600'
                : 'border-red-500/25 bg-zinc-900 text-zinc-300 hover:border-red-500/55 hover:text-red-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResponseActions({
  language,
  message,
  onRetrySearch,
  isLight,
}: {
  language: 'hi' | 'en';
  message: ChatMessage;
  onRetrySearch: (value: string) => void;
  isLight: boolean;
}) {
  if (!message.retryQuery && !message.primaryAction) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {message.retryQuery ? (
        <button
          type="button"
          onClick={() => onRetrySearch(message.retryQuery || '')}
          className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
            isLight
              ? 'border border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
              : 'border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          {language === 'hi' ? 'फिर कोशिश करें' : 'Try again'}
        </button>
      ) : null}

      {message.primaryAction ? (
        <Link
          href={message.primaryAction.url}
          className="rounded-xl border border-red-400/60 bg-[linear-gradient(135deg,#fb7185,#dc2626_56%,#991b1b)] px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(127,29,29,0.35)]"
        >
          {message.primaryAction.label}
        </Link>
      ) : null}
    </div>
  );
}

export default function AiChatMessages({
  language,
  messages,
  isWorking,
  errorText,
  messagesEndRef,
  onSuggestionSelect,
  onQuickSearch,
  onRetrySearch,
  suggestions,
  isLoadingSuggestions,
  categorySuggestions,
  isLoadingCategorySuggestions,
  isLight,
}: AiChatMessagesProps) {
  const greetingSeed = getGreetingSeed(language);
  const emptyStateSuggestions = getEmptyStateSuggestions(language);

  const visibleMessages = messages.filter(
    (message) =>
      !(
        message.role === 'assistant' &&
        message.text === greetingSeed &&
        !message.links?.length
      )
  );

  const areaClassName = isLight
    ? 'bg-[linear-gradient(180deg,#fff,#fff8f8)]'
    : 'bg-[linear-gradient(180deg,rgba(9,9,11,0.96),rgba(24,24,27,0.98))]';
  const aiBubbleClassName = isLight
    ? 'border border-red-200/85 bg-white text-zinc-800'
    : 'border border-red-500/25 bg-zinc-900/90 text-zinc-100';
  const suggestionClassName = isLight
    ? 'border-red-200 bg-white text-zinc-700 hover:border-red-500 hover:bg-red-50 hover:text-red-600'
    : 'border-red-500/25 bg-zinc-900/80 text-zinc-300 hover:border-red-500/55 hover:bg-red-500/8 hover:text-red-200';

  const emptyTitle =
    language === 'hi' ? 'नमस्ते! मैं Lokswami AI हूं।' : 'Namaste! I am Lokswami AI.';
  const emptyBody =
    language === 'hi'
      ? 'सर्च, सारांश और लाइव खबरों में मदद के लिए तैयार।'
      : 'Ready to help with search, summaries, and live updates.';
  const nextQuestionLabel = language === 'hi' ? 'अगला सवाल' : 'Next question';

  return (
    <div
      className={`relative z-10 flex-1 overflow-y-auto px-4 py-4 [scrollbar-color:#52525b_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 ${areaClassName}`}
    >
      {visibleMessages.length === 0 && !isWorking ? (
        <div className="flex h-full flex-col items-center justify-center px-4 text-center">
          <motion.div
            className="mb-4"
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <div className="inline-flex rounded-full border border-red-400/55 bg-[radial-gradient(circle_at_25%_15%,#f87171_0%,#dc2626_42%,#7f1d1d_74%,#09090b_100%)] p-4 text-white shadow-[0_16px_40px_rgba(127,29,29,0.5)]">
              <AiChatBrandMark />
            </div>
          </motion.div>

          <h3 className={`text-lg font-bold ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
            {emptyTitle}
          </h3>
          <p className={`mt-1 text-sm ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
            {emptyBody}
          </p>

          <SuggestionsRail
            language={language}
            suggestions={suggestions}
            isLoading={isLoadingSuggestions}
            isLight={isLight}
          />

          <div className="mt-5 w-full overflow-x-auto scrollbar-hide">
            <div className="flex w-max min-w-full flex-nowrap justify-center gap-2 pb-1">
              {emptyStateSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSuggestionSelect(suggestion)}
                  className={`flex-shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs transition-all ${suggestionClassName}`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleMessages.map((message) => {
            const isUser = message.role === 'user';
            const shouldShowCategorySuggestions =
              !isUser &&
              (message.answerSource === 'refused' ||
                message.answerSource === 'error_fallback' ||
                message.answerSource === 'empty_database' ||
                (!message.content &&
                  message.answerSource !== undefined &&
                  message.answerSource !== 'cms_articles'));

            return (
              <motion.div
                key={message.id}
                initial={MESSAGE_ANIMATION.initial}
                animate={MESSAGE_ANIMATION.animate}
                transition={MESSAGE_ANIMATION.transition}
                className={isUser ? 'flex justify-end' : 'flex'}
              >
                {isUser ? (
                  <div className="max-w-[84%] rounded-2xl rounded-tr-sm border border-red-400/65 bg-[linear-gradient(135deg,#fb7185,#dc2626_56%,#991b1b)] px-4 py-3 text-sm leading-relaxed text-white shadow-[0_12px_24px_rgba(127,29,29,0.42)]">
                    <p className="whitespace-pre-line break-words">{message.text}</p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <AssistantAvatar />

                    <div className="flex-1 space-y-3">
                      <div
                        className={`max-w-[92%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed ${aiBubbleClassName}`}
                      >
                        <p className="whitespace-pre-line break-words">{message.text}</p>

                        {message.followUpSuggestion ? (
                          <p className="mt-3 text-xs font-medium text-zinc-500">
                            {nextQuestionLabel}: {message.followUpSuggestion}
                          </p>
                        ) : null}

                        {message.links?.length && !message.content ? (
                          <ul
                            className={`mt-3 space-y-2 border-t pt-3 ${
                              isLight ? 'border-zinc-200' : 'border-zinc-700/50'
                            }`}
                          >
                            {message.links.map((linkItem) => (
                              <li key={linkItem.id}>
                                <Link
                                  href={
                                    linkItem.url ||
                                    `/main/article/${encodeURIComponent(linkItem.id)}`
                                  }
                                  className="line-clamp-2 text-xs font-semibold underline underline-offset-2 text-red-500 hover:text-red-400"
                                >
                                  {linkItem.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        <ResponseActions
                          language={language}
                          message={message}
                          onRetrySearch={onRetrySearch}
                          isLight={isLight}
                        />

                        {shouldShowCategorySuggestions ? (
                          <CategorySuggestionSection
                            language={language}
                            categorySuggestions={categorySuggestions}
                            isLoading={isLoadingCategorySuggestions}
                            onQuickSearch={onQuickSearch}
                            isLight={isLight}
                          />
                        ) : null}
                      </div>

                      {message.content ? (
                        <AiChatContentCards content={message.content} isLight={isLight} />
                      ) : null}

                      <ExploreMoreRow language={language} isLight={isLight} />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {isWorking ? (
            <motion.div
              initial={MESSAGE_ANIMATION.initial}
              animate={MESSAGE_ANIMATION.animate}
              transition={MESSAGE_ANIMATION.transition}
              className="flex"
            >
              <div className="flex items-start gap-3">
                <AssistantAvatar />
                <TypingIndicator isLight={isLight} />
              </div>
            </motion.div>
          ) : null}

          {errorText && visibleMessages.length === 0 ? (
            <p className="text-xs text-red-500 dark:text-red-300">
              {errorText || (language === 'hi' ? 'कुछ गलत हो गया।' : 'Something went wrong.')}
            </p>
          ) : null}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
