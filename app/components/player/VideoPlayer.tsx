'use client';

import { useEffect, useMemo, useRef } from 'react';

const LOCAL_PROGRESS_PREFIX = 'lokswami.video.progress.v1';

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getYouTubeId(urlString: string) {
  try {
    const url = new URL(urlString);
    const host = url.hostname.replace('www.', '').toLowerCase();

    if (host === 'youtu.be') return url.pathname.slice(1) || null;
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || null;
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || null;
    }
  } catch {
    return null;
  }

  return null;
}

function buildYouTubeEmbedUrl(videoId: string, shouldAutoplay: boolean, loopEnabled: boolean) {
  const params = new URLSearchParams({
    playsinline: '1',
    controls: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    autoplay: shouldAutoplay ? '1' : '0',
    loop: loopEnabled ? '1' : '0',
  });

  if (loopEnabled) {
    params.set('playlist', videoId);
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export interface VideoPlayerProps {
  videoId: string;
  title: string;
  src: string;
  poster?: string;
  fallbackDuration?: number;
  isActive: boolean;
  isPaused: boolean;
  isMuted: boolean;
  autoAdvance: boolean;
  playbackRate: number;
  defaultVolume: number;
  captionsEnabled: boolean;
  shouldPersistProgress?: boolean;
  onPausedChange: (paused: boolean) => void;
  onMutedChange: (muted: boolean) => void;
  onTimeChange: (currentTime: number, duration: number) => void;
  onEnded: () => void;
  onPlaybackRateChange?: (speed: number) => void;
  onCaptionsChange?: (enabled: boolean) => void;
}

export default function VideoPlayer({
  videoId,
  title,
  src,
  poster,
  fallbackDuration = 0,
  isActive,
  isPaused,
  isMuted,
  autoAdvance,
  playbackRate,
  defaultVolume,
  captionsEnabled,
  shouldPersistProgress = false,
  onPausedChange,
  onMutedChange,
  onTimeChange,
  onEnded,
  onPlaybackRateChange,
  onCaptionsChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeId = useMemo(() => getYouTubeId(src), [src]);
  const isYouTube = Boolean(youtubeId);
  const progressKey = useMemo(() => `${LOCAL_PROGRESS_PREFIX}:${videoId}`, [videoId]);
  const embedUrl = useMemo(() => {
    if (!youtubeId) return '';
    return buildYouTubeEmbedUrl(youtubeId, isActive && !isPaused, !autoAdvance);
  }, [autoAdvance, isActive, isPaused, youtubeId]);

  useEffect(() => {
    if (onCaptionsChange) {
      onCaptionsChange(captionsEnabled);
    }
  }, [captionsEnabled, onCaptionsChange]);

  useEffect(() => {
    if (isYouTube) return;
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;
    video.playbackRate = playbackRate > 0 ? playbackRate : 1;

    if (isActive && !isPaused) {
      void video.play().catch(() => {
        onPausedChange(true);
      });
      return;
    }

    video.pause();
  }, [isActive, isMuted, isPaused, isYouTube, onPausedChange, playbackRate]);

  useEffect(() => {
    if (isYouTube || !shouldPersistProgress) return;
    const video = videoRef.current;
    if (!video) return;

    try {
      const raw = window.localStorage.getItem(progressKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const savedCurrentTime = Math.max(0, toNumber(parsed.currentTime, 0));
      if (savedCurrentTime > 0) {
        video.currentTime = savedCurrentTime;
      }
    } catch {
      // Ignore localStorage issues.
    }
  }, [isYouTube, progressKey, shouldPersistProgress]);

  useEffect(() => {
    if (isYouTube || !shouldPersistProgress) return;
    const video = videoRef.current;
    if (!video) return;

    const persist = () => {
      try {
        window.localStorage.setItem(
          progressKey,
          JSON.stringify({
            currentTime: Math.max(0, video.currentTime || 0),
            duration: Math.max(0, video.duration || fallbackDuration),
            updatedAt: new Date().toISOString(),
          })
        );
      } catch {
        // Ignore localStorage issues.
      }
    };

    video.addEventListener('timeupdate', persist);
    return () => {
      video.removeEventListener('timeupdate', persist);
    };
  }, [fallbackDuration, isYouTube, progressKey, shouldPersistProgress]);

  if (isYouTube && embedUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="h-full w-full"
        playsInline
        controls
        muted={isMuted}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          const safeDuration = Math.max(0, video.duration || fallbackDuration);
          video.volume = Math.max(0, Math.min(1, defaultVolume));
          onTimeChange(Math.max(0, video.currentTime || 0), safeDuration);
        }}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          const safeDuration = Math.max(0, video.duration || fallbackDuration);
          onTimeChange(Math.max(0, video.currentTime || 0), safeDuration);
        }}
        onPlay={() => {
          onPausedChange(false);
        }}
        onPause={() => {
          onPausedChange(true);
        }}
        onVolumeChange={(event) => {
          const video = event.currentTarget;
          onMutedChange(Boolean(video.muted || video.volume === 0));
        }}
        onRateChange={(event) => {
          if (onPlaybackRateChange) {
            onPlaybackRateChange(event.currentTarget.playbackRate);
          }
        }}
        onEnded={() => {
          if (!autoAdvance) {
            onPausedChange(true);
          }
          onEnded();
        }}
      />
    </div>
  );
}
