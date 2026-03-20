'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Newspaper } from 'lucide-react';
import type { CSSProperties, PointerEvent } from 'react';

type DesktopHeroEpaperCardProps = {
  href: string;
  dateLabel?: string;
  thumbnailSrc: string;
  thumbnailAlt: string;
  eyebrowLabel: string;
  title: string;
  editionLabel: string;
  supportLabel?: string;
  ctaLabel: string;
  ariaLabel: string;
};

export default function DesktopHeroEpaperCard({
  href,
  dateLabel,
  thumbnailSrc,
  thumbnailAlt,
  eyebrowLabel,
  title,
  editionLabel,
  supportLabel,
  ctaLabel,
  ariaLabel,
}: DesktopHeroEpaperCardProps) {
  const initialSpotlightStyle = {
    '--epaper-spotlight-x': '72%',
    '--epaper-spotlight-y': '26%',
  } as CSSProperties;

  const handlePointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    const { currentTarget, clientX, clientY } = event;
    const rect = currentTarget.getBoundingClientRect();
    currentTarget.style.setProperty('--epaper-spotlight-x', `${clientX - rect.left}px`);
    currentTarget.style.setProperty('--epaper-spotlight-y', `${clientY - rect.top}px`);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.setProperty('--epaper-spotlight-x', '72%');
    event.currentTarget.style.setProperty('--epaper-spotlight-y', '26%');
  };

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="epaper-premium-card group relative block h-full overflow-hidden rounded-[1.6rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.12),transparent_32%),linear-gradient(180deg,#17171c_0%,#121319_100%)] px-3.5 py-2 text-white shadow-[0_22px_54px_rgba(0,0,0,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_68px_rgba(0,0,0,0.3)]"
      style={initialSpotlightStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="epaper-premium-aurora pointer-events-none absolute inset-[-35%] opacity-70" />
      <div className="epaper-premium-spotlight pointer-events-none absolute inset-0 rounded-[inherit]" />
      <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,rgba(239,68,68,0.9)_0%,rgba(249,115,22,0.72)_48%,transparent_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_38%,transparent_64%,rgba(239,68,68,0.08))]" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-red-500/10 blur-3xl" />

      <div className="relative grid h-full grid-cols-[150px_minmax(0,1fr)] items-center gap-3">
        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-[136px]">
            <div className="pointer-events-none absolute inset-x-3 top-3 aspect-[3/4] rounded-[1rem] border border-white/8 bg-white/8 rotate-[5deg]" />
            <div className="pointer-events-none absolute inset-x-2 top-1 aspect-[3/4] rounded-[1rem] border border-white/8 bg-black/20 -rotate-[4deg]" />
            <div className="relative rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-1.5 shadow-[0_18px_34px_rgba(0,0,0,0.22)]">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[1rem] bg-[#f6f1e8]">
                <Image
                  src={thumbnailSrc}
                  alt={thumbnailAlt}
                  fill
                  className="object-contain p-1 transition-transform duration-500 group-hover:scale-[1.02]"
                  sizes="136px"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-[#f6f1e8] via-[#f6f1e8]/96 to-transparent" />
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex flex-col justify-start gap-2.5 pt-1 pb-0.5">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.14em] text-red-50">
            <Newspaper className="h-3 w-3 text-red-200" />
            {eyebrowLabel}
          </span>

          <div className="space-y-2 pt-0.5">
            <h3 className="line-clamp-2 text-[1.02rem] font-black leading-[1.12] tracking-tight text-white">
              <span>{title}</span>
              <span className="mx-1.5 font-medium text-zinc-500">&mdash;</span>
              <span className="font-semibold text-zinc-200">{editionLabel}</span>
            </h3>

            {supportLabel ? (
              <p className="max-w-[24ch] line-clamp-2 text-[9.75px] leading-[1.45] text-zinc-400">
                {supportLabel}
              </p>
            ) : null}
          </div>

          <div className="pt-1.5">
            <div className="flex flex-nowrap items-center gap-1.5">
              {dateLabel ? (
                <span className="inline-flex h-[28px] shrink-0 items-center gap-1 rounded-full border border-white/12 bg-black/20 px-2.5 text-[8.5px] font-semibold text-zinc-200">
                  <CalendarDays className="h-3 w-3 text-red-300" />
                  <span className="whitespace-nowrap">{dateLabel}</span>
                </span>
              ) : (
                <span />
              )}

              <span className="epaper-premium-button inline-flex h-[28px] shrink-0 items-center gap-1 rounded-full border border-red-400/25 bg-[linear-gradient(180deg,rgba(239,68,68,0.96)_0%,rgba(185,28,28,0.96)_100%)] px-3 text-[8.75px] font-bold text-white shadow-[0_14px_30px_rgba(127,29,29,0.24)] transition-transform duration-300 group-hover:translate-x-0.5">
                <span className="epaper-premium-button-shimmer pointer-events-none absolute inset-0" />
                <span className="relative z-10">{ctaLabel}</span>
                <ArrowRight className="relative z-10 h-3 w-3" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
