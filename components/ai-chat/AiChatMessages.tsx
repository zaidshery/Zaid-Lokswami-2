'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FileText, Newspaper, PlayCircle, Video } from 'lucide-react';
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
    ? '\u0928\u092e\u0938\u094d\u0915\u093e\u0930, \u092e\u0948\u0902 Lokswami AI Desk \u0939\u0942\u0901\u0964 \u092e\u0948\u0902 \u0906\u092a\u0915\u094b \u0938\u0941\u0930\u094d\u0916\u093f\u092f\u093e\u0901, \u091c\u093f\u0932\u093e \u0915\u0935\u0930\u0947\u091c, \u0908-\u092a\u0947\u092a\u0930 \u0914\u0930 \u0938\u093e\u0930\u093e\u0902\u0936 \u092e\u0947\u0902 \u092e\u0926\u0926 \u0915\u0930 \u0938\u0915\u0924\u093e \u0939\u0942\u0901\u0964'
    : 'Hello, this is Lokswami AI Desk. I can help with headlines, local coverage, e-paper access, summaries, and read-aloud support.';
}

function getEmptyStateSuggestions(language: 'hi' | 'en') {
  return language === 'hi'
    ? [
        '\u0906\u091c \u0915\u0940 \u092e\u0941\u0916\u094d\u092f \u0916\u092c\u0930\u0947\u0902',
        '\u092e\u0947\u0930\u0947 \u091c\u093f\u0932\u0947 \u0915\u0940 \u0916\u092c\u0930\u0947\u0902',
        '\u0906\u091c \u0915\u093e \u0908-\u092a\u0947\u092a\u0930',
      ]
    : ["Today's headlines", 'News from my district', "Open today's e-paper"];
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
    ? 'border border-zinc-200 bg-white text-zinc-800'
    : 'border border-zinc-800 bg-zinc-900/90 text-zinc-100';

  return (
    <div className={`rounded-2xl rounded-tl-sm px-4 py-3 ${bubbleClassName}`}>
      <div className="flex items-center gap-1 py-1">
        {[0, 0.2, 0.4].map((delay) => (
          <motion.span
            key={delay}
            className="h-2 w-2 rounded-full bg-red-500"
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
    ? 'rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 transition hover:border-red-400 hover:text-red-700'
    : 'rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 transition hover:border-red-500/55 hover:text-red-200';

  const labels =
    language === 'hi'
      ? {
          news: '\u0914\u0930 \u0915\u0935\u0930\u0947\u091c',
          videos: '\u0935\u0940\u0921\u093f\u092f\u094b',
          epaper: '\u0908-\u092a\u0947\u092a\u0930',
        }
      : { news: 'More coverage', videos: 'Videos', epaper: 'E-Paper' };

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

function getCardIcon(type: 'epaper' | 'video' | 'story' | 'article') {
  if (type === 'epaper') {
    return <Newspaper className="h-5 w-5" />;
  }
  if (type === 'video') {
    return <Video className="h-5 w-5" />;
  }
  if (type === 'story') {
    return <PlayCircle className="h-5 w-5" />;
  }
  return <FileText className="h-5 w-5" />;
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
                isLight ? 'border-zinc-200 bg-zinc-100/80' : 'border-zinc-800 bg-zinc-900'
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
        {language === 'hi'
          ? '\u0905\u092d\u0940 \u0915\u0947 \u0938\u0941\u091d\u093e\u0935'
          : 'Recommended now'}
      </p>

      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 pb-1">
          {cards.map((card) => (
            <Link
              key={`${card.type}-${card.title}`}
              href={card.url}
              className={`flex h-24 w-[220px] flex-shrink-0 gap-3 rounded-2xl border p-3 text-left transition hover:scale-[1.02] ${
                isLight
                  ? 'border-zinc-200 bg-white hover:border-red-300'
                  : 'border-zinc-800 bg-zinc-950/90 hover:border-red-500/35'
              }`}
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
                        <span className="inline-flex rounded-full bg-black/70 p-1.5 text-white">
                          <PlayCircle className="h-4 w-4" />
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
                <div
                  className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl ${
                    isLight ? 'bg-red-50 text-red-700' : 'bg-zinc-900 text-red-300'
                  }`}
                >
                  {getCardIcon(card.type)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-red-600 dark:text-red-300">
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
          ))}
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
        {language === 'hi'
          ? '\u0906\u092a \u092f\u0939 \u092d\u0940 \u092a\u0942\u091b \u0938\u0915\u0924\u0947 \u0939\u0948\u0902'
          : 'You can also ask'}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {categorySuggestions.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onQuickSearch(item.query)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              isLight
                ? 'border-zinc-300 bg-white text-zinc-700 hover:border-red-400 hover:text-red-700'
                : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-red-500/55 hover:text-red-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StructuredAnswerBlock({
  language,
  message,
  onQuickSearch,
  isLight,
}: {
  language: 'hi' | 'en';
  message: ChatMessage;
  onQuickSearch: (value: string) => void;
  isLight: boolean;
}) {
  const answer = message.structuredAnswer;
  if (!answer) {
    return <p className="whitespace-pre-line break-words">{message.text}</p>;
  }

  const sectionTitleClassName = `text-[11px] font-semibold uppercase tracking-[0.14em] ${
    isLight ? 'text-zinc-500' : 'text-zinc-400'
  }`;
  const questionButtonClassName = `rounded-full border px-3 py-1.5 text-xs font-medium transition ${
    isLight
      ? 'border-zinc-300 bg-white text-zinc-700 hover:border-red-400 hover:text-red-700'
      : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-red-500/55 hover:text-red-200'
  }`;

  return (
    <div className="space-y-3">
      <div>
        <p className={`text-base font-semibold ${isLight ? 'text-zinc-950' : 'text-white'}`}>
          {answer.headline}
        </p>
        <p className="mt-2 whitespace-pre-line break-words">{answer.summary}</p>
      </div>

      {answer.keyPoints.length ? (
        <div>
          <p className={sectionTitleClassName}>
            {language === 'hi' ? 'मुख्य बिंदु' : 'Key Points'}
          </p>
          <ul className="mt-2 space-y-2">
            {answer.keyPoints.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-600" />
                <span className="flex-1 break-words">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {answer.whyItMatters ? (
        <div>
          <p className={sectionTitleClassName}>
            {language === 'hi' ? 'क्यों महत्वपूर्ण है' : 'Why It Matters'}
          </p>
          <p className="mt-2 break-words">{answer.whyItMatters}</p>
        </div>
      ) : null}

      {answer.fallbackNote ? (
        <div
          className={`rounded-xl border px-3 py-2 text-xs ${
            isLight
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-amber-500/25 bg-amber-500/10 text-amber-100'
          }`}
        >
          {answer.fallbackNote}
        </div>
      ) : null}

      {answer.relatedQuestions.length ? (
        <div>
          <p className={sectionTitleClassName}>
            {language === 'hi' ? 'संबंधित सवाल' : 'Related Questions'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {answer.relatedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onQuickSearch(question)}
                className={questionButtonClassName}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      ) : null}
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
          {language === 'hi'
            ? '\u092b\u093f\u0930 \u0915\u094b\u0936\u093f\u0936 \u0915\u0930\u0947\u0902'
            : 'Try again'}
        </button>
      ) : null}

      {message.primaryAction ? (
        <Link
          href={message.primaryAction.url}
          className="rounded-xl border border-red-700 bg-red-700 px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(127,29,29,0.24)]"
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
    ? 'bg-[linear-gradient(180deg,#fff,#fff9f9)]'
    : 'bg-[linear-gradient(180deg,rgba(9,9,11,0.96),rgba(24,24,27,0.98))]';
  const aiBubbleClassName = isLight
    ? 'border border-zinc-200 bg-white text-zinc-800'
    : 'border border-zinc-800 bg-zinc-900/90 text-zinc-100';
  const suggestionClassName = isLight
    ? 'border-zinc-300 bg-white text-zinc-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700'
    : 'border-zinc-700 bg-zinc-900/80 text-zinc-300 hover:border-red-500/55 hover:bg-red-500/8 hover:text-red-200';

  const emptyTitle =
    language === 'hi'
      ? 'Lokswami AI Desk \u0938\u0947 \u092a\u0942\u091b\u0947\u0902'
      : 'Ask Lokswami AI Desk';
  const emptyBody =
    language === 'hi'
      ? '\u092e\u0948\u0902 \u0906\u092a\u0915\u094b \u0938\u0941\u0930\u094d\u0916\u093f\u092f\u093e\u0901, \u091c\u093f\u0932\u093e \u0915\u0935\u0930\u0947\u091c, \u0908-\u092a\u0947\u092a\u0930 \u0914\u0930 \u0924\u094d\u0935\u0930\u093f\u0924 \u0938\u093e\u0930\u093e\u0902\u0936 \u0926\u0947 \u0938\u0915\u0924\u093e \u0939\u0942\u0901\u0964'
      : 'I can help with headlines, district coverage, e-paper access, quick summaries, and read-aloud support.';
  const nextQuestionLabel =
    language === 'hi'
      ? '\u0905\u0917\u0932\u093e \u0938\u0941\u091d\u093e\u0935'
      : 'Suggested follow-up';

  return (
    <div
      className={`relative z-10 flex-1 overflow-y-auto px-4 py-4 [scrollbar-color:#52525b_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700 ${areaClassName}`}
    >
      {visibleMessages.length === 0 && !isWorking ? (
        <div className="flex h-full flex-col items-center justify-center px-4 text-center">
          <div
            className={`mb-4 inline-flex rounded-full border p-4 ${
              isLight
                ? 'border-red-200 bg-white text-red-700 shadow-[0_16px_40px_rgba(24,24,27,0.08)]'
                : 'border-zinc-700 bg-zinc-900 text-red-300 shadow-[0_16px_40px_rgba(0,0,0,0.35)]'
            }`}
          >
            <AiChatBrandMark />
          </div>

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
                  <div className="max-w-[84%] rounded-2xl rounded-tr-sm border border-red-700 bg-red-700 px-4 py-3 text-sm leading-relaxed text-white shadow-[0_12px_24px_rgba(127,29,29,0.24)]">
                    <p className="whitespace-pre-line break-words">{message.text}</p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <AssistantAvatar />

                    <div className="flex-1 space-y-3">
                      <div
                        className={`max-w-[92%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed ${aiBubbleClassName}`}
                      >
                        <StructuredAnswerBlock
                          language={language}
                          message={message}
                          onQuickSearch={onQuickSearch}
                          isLight={isLight}
                        />

                        {message.followUpSuggestion && !message.structuredAnswer ? (
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
                                  className="line-clamp-2 text-xs font-semibold underline underline-offset-2 text-red-700 hover:text-red-500"
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
              {errorText ||
                (language === 'hi'
                  ? '\u0915\u0941\u091b \u0917\u0932\u0924 \u0939\u094b \u0917\u092f\u093e\u0964'
                  : 'Something went wrong.')}
            </p>
          ) : null}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
