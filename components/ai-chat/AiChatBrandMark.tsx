'use client';

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

type AiChatBrandMarkProps = {
  compact?: boolean;
  pulse?: boolean;
  className?: string;
  src?: string;
  plain?: boolean;
  imageScale?: number;
  imagePosition?: string;
};

const DEFAULT_AVATAR_SRC =
  process.env.NEXT_PUBLIC_AI_AVATAR_URL?.trim() || '/ai/female-ai-bot.png';

function FemaleAiAvatar() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="lokswami-avatar-skin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDE2E4" />
          <stop offset="100%" stopColor="#F8B4BA" />
        </linearGradient>
        <linearGradient id="lokswami-avatar-jacket" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#111827" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="21" r="13" fill="#1A0D13" />
      <circle cx="32" cy="24" r="9.2" fill="url(#lokswami-avatar-skin)" />
      <path d="M22 20.8c1.8-4.2 5.3-6.6 10-6.6s8.2 2.4 10 6.6" fill="none" stroke="#12080C" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="22" r="1.2" fill="#B91C1C" />
      <path d="M28.6 27.3c1.8 1.4 5 1.4 6.8 0" fill="none" stroke="#9F1239" strokeWidth="1.4" strokeLinecap="round" />

      <path d="M14 58c1.4-8.8 8.4-14.2 18-14.2S48.6 49.2 50 58H14Z" fill="url(#lokswami-avatar-jacket)" />
      <path d="M26.5 44h11l-5.5 7.2-5.5-7.2Z" fill="#F8FAFC" />

      <g transform="translate(42.2,38.8)">
        <circle cx="0" cy="0" r="6.4" fill="#E63946" />
        <rect x="-1.35" y="-2.9" width="2.7" height="4.4" rx="1.25" fill="#FFFFFF" />
        <rect x="-2.25" y="1.2" width="4.5" height="1.4" rx="0.7" fill="#FFFFFF" />
        <path d="M-3.2 3.3c1.9 1.5 4.5 1.5 6.4 0" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function AiChatBrandMark({
  compact = false,
  pulse = false,
  className = '',
  src,
  plain = false,
  imageScale = 1.35,
  imagePosition = '50% 42%',
}: AiChatBrandMarkProps) {
  const sizeClass = compact ? 'h-10 w-10 md:h-11 md:w-11' : 'h-11 w-11 md:h-12 md:w-12';
  const resolvedSrc = useMemo(() => (src?.trim() ? src.trim() : DEFAULT_AVATAR_SRC), [src]);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${sizeClass} ${className}`}>
      {pulse ? (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full border border-red-300/45"
          animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}

      <span
        className={`relative inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full ${
          plain
            ? ''
            : 'bg-gradient-to-br from-[#e63946] to-[#c1121f] shadow-[0_0_12px_rgba(230,57,70,0.6)]'
        }`}
      >
        {!plain ? (
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.24),rgba(255,255,255,0))]" />
        ) : null}
        {resolvedSrc && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedSrc}
            alt=""
            aria-hidden="true"
            className="relative z-10 h-full w-full rounded-full object-cover"
            style={{
              objectPosition: imagePosition,
              transform: `scale(${imageScale})`,
            }}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className={`relative z-10 ${plain ? 'h-full w-full' : 'h-[82%] w-[82%]'}`}>
            <FemaleAiAvatar />
          </span>
        )}
      </span>
    </span>
  );
}
