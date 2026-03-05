'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Captions,
  Maximize,
  Minimize,
  Pause,
  Play,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';

const SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2] as const;
const CONTROLS_HIDE_DELAY_MS = 2000;
const SAVE_PROGRESS_EVERY_MS = 5000;
const LOCAL_PROGRESS_PREFIX = 'lokswami.video.progress.v1';

type MaybeOrientationApi = ScreenOrientation & {
  lock?: (orientation: OrientationLockType) => Promise<void>;
  unlock?: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '00:00';
  }

  const safeTotalSeconds = Math.floor(totalSeconds);
  const hours = Math.floor(safeTotalSeconds / 3600);
  const minutes = Math.floor((safeTotalSeconds % 3600) / 60);
  const seconds = safeTotalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getYouTubeId(urlString: string) {
  try {
    const url = new URL(urlString);
    const host = url.hostname.replace('www.', '').toLowerCase();

    if (host === 'youtu.be') {
      return url.pathname.slice(1) || null;
    }

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

function buildYouTubeEmbedUrl(videoId: string, isActive: boolean, loopEnabled: boolean) {
  const params = new URLSearchParams({
    enablejsapi: '1',
    playsinline: '1',
    controls: '0',
    mute: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    fs: '0',
    autoplay: isActive ? '1' : '0',
    loop: loopEnabled ? '1' : '0',
  });

  if (loopEnabled) {
    params.set('playlist', videoId);
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

type PersistReason = 'interval' | 'pause' | 'inactive' | 'unload';

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const scrubCleanupRef = useRef<(() => void) | null>(null);
  const wasPlayingBeforeScrubRef = useRef(false);
  const youtubeLastFrameRef = useRef<number | null>(null);
  const scrubTimeRef = useRef(0);
  const pendingResumeRef = useRef<number | null>(null);
  const endedSentRef = useRef(false);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(Math.max(0, fallbackDuration));
  const bufferedRatioRef = useRef(0);
  const lastPersistedAtRef = useRef(0);
  const persistInFlightRef = useRef(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubRatio, setScrubRatio] = useState(0);
  const [scrubTime, setScrubTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(Math.max(0, fallbackDuration));
  const [bufferedRatio, setBufferedRatio] = useState(0);
  const [hasSubtitleTrack, setHasSubtitleTrack] = useState(false);

  const youtubeId = useMemo(() => getYouTubeId(src), [src]);
  const isYouTube = Boolean(youtubeId);
  const localProgressKey = useMemo(
    () => `${LOCAL_PROGRESS_PREFIX}:${videoId}`,
    [videoId]
  );
  const effectiveDuration = duration > 0 ? duration : Math.max(0, fallbackDuration);
  const displayTime = isScrubbing ? scrubTime : currentTime;
  const playedRatio =
    effectiveDuration > 0 ? clamp(displayTime / effectiveDuration, 0, 1) : 0;
  const shownScrubRatio = isScrubbing ? scrubRatio : playedRatio;

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current === null) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const scheduleAutoHide = useCallback(() => {
    clearHideTimer();

    if (!isActive || isPaused || isScrubbing || settingsOpen) return;

    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, CONTROLS_HIDE_DELAY_MS);
  }, [clearHideTimer, isActive, isPaused, isScrubbing, settingsOpen]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    scheduleAutoHide();
  }, [scheduleAutoHide]);

  const sendYouTubeCommand = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: 'command',
        func,
        args,
      }),
      '*'
    );
  }, []);

  const writeLocalFallbackProgress = useCallback(
    (nextCurrentTime: number, nextDuration: number) => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(
          localProgressKey,
          JSON.stringify({
            currentTime: Math.max(0, nextCurrentTime),
            duration: Math.max(0, nextDuration),
            updatedAt: new Date().toISOString(),
          })
        );
      } catch {
        // Ignore storage write failures.
      }
    },
    [localProgressKey]
  );

  const readLocalFallbackProgress = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = window.localStorage.getItem(localProgressKey);
      if (!saved) return null;
      const parsed = JSON.parse(saved) as Record<string, unknown>;
      const savedCurrentTime = Math.max(0, toNumber(parsed.currentTime, 0));
      const savedDuration = Math.max(0, toNumber(parsed.duration, 0));
      return {
        currentTime: savedCurrentTime,
        duration: savedDuration,
      };
    } catch {
      return null;
    }
  }, [localProgressKey]);
