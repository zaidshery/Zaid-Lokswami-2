'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { RefObject } from 'react';
import type { ChatMessage } from './types';

type AiChatMessagesProps = {
  language: 'hi' | 'en';
  messages: ChatMessage[];
  isWorking: boolean;
  errorText: string;
  messagesEndRef: RefObject<HTMLDivElement | null>;
};

function TypingDots() {
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md border border-[#262626] bg-[#151515] px-3 py-2">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
    </div>
  );
}

export default function AiChatMessages({
  language,
  messages,
  isWorking,
  errorText,
  messagesEndRef,
}: AiChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0B0B] px-3 py-3">
      <div className="space-y-3">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[88%] items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isUser ? (
                  <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-[#262626] bg-black">
                    <Image src="/logo-icon-final.png" alt="AI" fill sizes="24px" className="object-cover" />
                  </span>
                ) : null}

                <div
                  className={`rounded-2xl px-3 py-2 text-sm leading-6 ${
                    isUser
                      ? 'rounded-br-md bg-[#E11D2E] text-white'
                      : 'rounded-bl-md border border-[#262626] bg-[#151515] text-[#EAEAEA]'
                  }`}
                >
                  <p className="whitespace-pre-line">{message.text}</p>
                  {message.links?.length ? (
                    <ul className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                      {message.links.map((linkItem) => (
                        <li key={linkItem.id}>
                          <Link
                            href={`/main/article/${encodeURIComponent(linkItem.id)}`}
                            className="line-clamp-2 text-xs font-semibold text-red-300 transition hover:text-red-200"
                          >
                            {linkItem.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        {isWorking ? (
          <div className="flex justify-start gap-2">
            <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-[#262626] bg-black">
              <Image src="/logo-icon-final.png" alt="AI" fill sizes="24px" className="object-cover" />
            </span>
            <TypingDots />
          </div>
        ) : null}

        {errorText ? (
          <p className="text-xs text-red-400">
            {errorText || (language === 'hi' ? 'Kuch galat ho gaya.' : 'Something went wrong.')}
          </p>
        ) : null}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
