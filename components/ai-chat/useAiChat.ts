'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BHASHINI_LANGUAGE_OPTIONS } from '@/lib/constants/lokswamiAi';
import { useAppStore } from '@/lib/store/appStore';
import type { ChatMessage, ChatRole, UseAiChatOptions, UseAiChatResult } from './types';

type AwarenessResult = {
  id: string;
  title: string;
  summary: string;
  snippet?: string;
};

type AwarenessResponse = {
  success?: boolean;
  data?: {
    answer?: string;
    results?: AwarenessResult[];
  };
  error?: string;
};

type SummaryResponse = {
  success?: boolean;
  data?: {
    bullets?: string[];
  };
  error?: string;
};

type TtsStatusResponse = {
  success?: boolean;
  data?: {
    bhashiniConfigured?: boolean;
  };
};

type TtsResponse = {
  success?: boolean;
  data?: {
    audioUrl?: string;
    audioBase64?: string;
    mimeType?: string;
  };
  error?: string;
};

function createMessage(role: ChatRole, text: string, links?: ChatMessage['links']): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    role,
    text,
    links,
  };
}

function normalizeLangCode(value: string) {
  return value.trim().toLowerCase();
}

function getBaseLang(value: string) {
  return normalizeLangCode(value).split('-')[0] || '';
}

function isLangSupportedByVoices(targetCode: string, voices: string[]) {
  const normalizedTarget = normalizeLangCode(targetCode);
  const base = getBaseLang(targetCode);
  if (!normalizedTarget || !base) return false;

  return voices.some((voiceCode) => {
    const normalizedVoice = normalizeLangCode(voiceCode);
    return (
      normalizedVoice === normalizedTarget ||
      normalizedVoice.startsWith(`${base}-`) ||
      normalizedVoice === base
    );
  });
}

function pickBestVoice(voices: SpeechSynthesisVoice[], targetCode: string) {
  const normalizedTarget = normalizeLangCode(targetCode);
  const baseTarget = getBaseLang(targetCode);

  return (
    voices.find((voice) => normalizeLangCode(voice.lang) === normalizedTarget) ||
    voices.find((voice) => normalizeLangCode(voice.lang).startsWith(`${baseTarget}-`)) ||
    voices.find((voice) => normalizeLangCode(voice.lang) === 'hi-in') ||
    voices.find((voice) => normalizeLangCode(voice.lang).startsWith('hi-')) ||
    voices.find((voice) => normalizeLangCode(voice.lang) === 'en-us') ||
    voices.find((voice) => normalizeLangCode(voice.lang).startsWith('en-')) ||
    voices[0]
  );
}

async function ensureVoices(speech: SpeechSynthesis) {
  let voices = speech.getVoices();
  if (voices.length) return voices;

  voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(speech.getVoices());
    }, 800);

    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(speech.getVoices());
    };

    if (typeof speech.addEventListener === 'function') {
      speech.addEventListener('voiceschanged', done, { once: true });
    } else {
      const previous = speech.onvoiceschanged;
      speech.onvoiceschanged = () => {
        done();
        speech.onvoiceschanged = previous;
      };
    }
  });

  return voices;
}

function isAwarenessResult(value: unknown): value is AwarenessResult {
  if (!value || typeof value !== 'object') return false;
  const source = value as Partial<AwarenessResult>;
  return (
    typeof source.id === 'string' &&
    typeof source.title === 'string' &&
    typeof source.summary === 'string'
  );
}

function toSpeakableText(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 3200);
}

export function useAiChat(options: UseAiChatOptions): UseAiChatResult {
  const { isOpen } = options;
  const { language } = useAppStore();
  const pathname = usePathname();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [errorText, setErrorText] = useState('');

  const [listenLanguageCode, setListenLanguageCode] = useState('hi-IN');
  const [isPreparingListen, setIsPreparingListen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [listenError, setListenError] = useState('');
  const [isBhashiniConfigured, setIsBhashiniConfigured] = useState(false);
  const [browserVoiceLangCodes, setBrowserVoiceLangCodes] = useState<string[]>([]);

  const currentArticleId = useMemo(() => {
    const match = pathname.match(/\/main\/article\/([^/?#]+)/i);
    if (!match?.[1]) return '';
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }, [pathname]);

  const latestAssistantText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant' && messages[i].text.trim()) {
        return messages[i].text;
      }
    }
    return '';
  }, [messages]);

  const listenLanguageOptions = useMemo(() => {
    if (isBhashiniConfigured) return BHASHINI_LANGUAGE_OPTIONS;

    const filtered = BHASHINI_LANGUAGE_OPTIONS.filter((option) =>
      isLangSupportedByVoices(option.code, browserVoiceLangCodes)
    );
    if (filtered.length) return filtered;

    const hindi = BHASHINI_LANGUAGE_OPTIONS.find((item) => item.code === 'hi-IN');
    return hindi ? [hindi] : BHASHINI_LANGUAGE_OPTIONS.slice(0, 1);
  }, [browserVoiceLangCodes, isBhashiniConfigured]);

  const searchRouteHref = draft.trim()
    ? `/main/search?q=${encodeURIComponent(draft.trim())}`
    : '/main/search';

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const stopListening = useCallback((suppressState = false) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (!suppressState) {
      setIsPlayingAudio(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (messages.length) return;

    const greeting =
      language === 'hi'
        ? 'Namaste, main Lokswami AI hoon. Aap search, TL;DR summary, ya listen feature use kar sakte hain.'
        : 'Hello, I am Lokswami AI. You can use semantic search, TL;DR summary, and listen mode here.';
    setMessages([createMessage('assistant', greeting)]);
  }, [isOpen, language, messages.length]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isOpen, messages, isWorking]);

  useEffect(() => {
    let active = true;

    const loadTtsStatus = async () => {
      try {
        const response = await fetch('/api/ai/tts', {
          method: 'GET',
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => ({}))) as TtsStatusResponse;
        if (!active) return;
        setIsBhashiniConfigured(Boolean(payload?.success && payload?.data?.bhashiniConfigured));
      } catch {
        if (!active) return;
        setIsBhashiniConfigured(false);
      }
    };

    void loadTtsStatus();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const speech = window.speechSynthesis;

    const syncVoices = () => {
      const voices = speech.getVoices();
      const codes = Array.from(
        new Set(
          voices
            .map((voice) => voice.lang)
            .filter((value): value is string => Boolean(value && value.trim()))
        )
      );
      setBrowserVoiceLangCodes(codes);
    };

    syncVoices();

    const handleVoicesChanged = () => {
      syncVoices();
    };

    if (typeof speech.addEventListener === 'function') {
      speech.addEventListener('voiceschanged', handleVoicesChanged);
      return () => {
        speech.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }

    const previous = speech.onvoiceschanged;
    speech.onvoiceschanged = handleVoicesChanged;
    return () => {
      speech.onvoiceschanged = previous;
    };
  }, []);

  useEffect(() => {
    if (!listenLanguageOptions.length) return;
    const exists = listenLanguageOptions.some((item) => item.code === listenLanguageCode);
    if (!exists) {
      setListenLanguageCode(listenLanguageOptions[0].code);
    }
  }, [listenLanguageCode, listenLanguageOptions]);

  useEffect(() => {
    return () => {
      stopListening(true);
    };
  }, [stopListening]);

  const runAwarenessSearch = async (query: string) => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    setErrorText('');
    setIsWorking(true);
    appendMessage(createMessage('user', cleanQuery));

    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: cleanQuery,
          limit: 6,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as AwarenessResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'AI search failed.');
      }

      const answer =
        typeof payload.data.answer === 'string' && payload.data.answer.trim()
          ? payload.data.answer.trim()
          : language === 'hi'
            ? 'Search result mil gaya. Neeche relevant stories dekh sakte hain.'
            : 'Search completed. You can check relevant stories below.';

      const links = Array.isArray(payload.data.results)
        ? payload.data.results
            .filter((item) => isAwarenessResult(item))
            .slice(0, 3)
            .map((item) => ({ id: item.id, title: item.title }))
        : [];

      appendMessage(createMessage('assistant', answer, links.length ? links : undefined));
    } catch (error) {
      const fallback =
        error instanceof Error
          ? error.message
          : language === 'hi'
            ? 'AI search is samay uplabdh nahi hai.'
            : 'AI search is currently unavailable.';
      setErrorText(fallback);
      appendMessage(createMessage('assistant', fallback));
    } finally {
      setIsWorking(false);
    }
  };

  const runSummary = async (mode: 'article' | 'text') => {
    const trimmedText = draft.trim();
    const useArticle = mode === 'article' && Boolean(currentArticleId);
    const useText = mode === 'text' && Boolean(trimmedText);

    if (!useArticle && !useText) {
      const noSourceText =
        language === 'hi'
          ? 'Summary ke liye article open karein ya text likhein.'
          : 'Open an article or enter text for summary.';
      setErrorText(noSourceText);
      appendMessage(createMessage('assistant', noSourceText));
      return;
    }

    setErrorText('');
    setIsWorking(true);

    if (useText) {
      appendMessage(createMessage('user', trimmedText));
      setDraft('');
    } else {
      appendMessage(
        createMessage('user', language === 'hi' ? 'Is article ka TL;DR do.' : 'Summarize this article.')
      );
    }

    try {
      const body: { articleId?: string; text?: string; language: 'hi' | 'en' } = {
        language,
      };

      if (useArticle) {
        body.articleId = currentArticleId;
      } else {
        body.text = trimmedText;
      }

      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = (await response.json().catch(() => ({}))) as SummaryResponse;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Summary generation failed.');
      }

      const bullets = Array.isArray(payload.data.bullets)
        ? payload.data.bullets.filter(
            (item): item is string => typeof item === 'string' && item.trim().length > 0
          )
        : [];

      if (!bullets.length) {
        throw new Error('Summary returned no points.');
      }

      const summaryText = bullets.slice(0, 3).map((item) => `- ${item}`).join('\n');
      appendMessage(createMessage('assistant', summaryText));
    } catch (error) {
      const fallback =
        error instanceof Error
          ? error.message
          : language === 'hi'
            ? 'Summary banaane mein dikkat aayi.'
            : 'Unable to generate summary.';
      setErrorText(fallback);
      appendMessage(createMessage('assistant', fallback));
    } finally {
      setIsWorking(false);
    }
  };

  const speakWithBrowserFallback = async (sourceText: string, friendlyVoiceMessage: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setListenError(
        language === 'hi'
          ? 'Listen feature is browser mein available nahi hai.'
          : 'Listen feature is unavailable in this browser.'
      );
      return;
    }

    const speech = window.speechSynthesis;
    const voices = await ensureVoices(speech);
    if (!voices.length) {
      setListenError(friendlyVoiceMessage);
      return;
    }

    const preferredVoice = pickBestVoice(voices, listenLanguageCode);
    const utterance = new SpeechSynthesisUtterance(sourceText);
    utterance.voice = preferredVoice || null;
    utterance.lang = preferredVoice?.lang || listenLanguageCode;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => {
      setIsPlayingAudio(false);
    };
    utterance.onerror = () => {
      setIsPlayingAudio(false);
      setListenError(friendlyVoiceMessage);
    };

    speech.cancel();
    speech.speak(utterance);
    setIsPlayingAudio(true);
  };

  const handleListen = async () => {
    const sourceText = toSpeakableText(latestAssistantText || draft.trim());
    if (!sourceText) {
      setListenError(
        language === 'hi'
          ? 'Sunane ke liye pehle AI response ya text chahiye.'
          : 'Need AI response or text before using Listen.'
      );
      return;
    }

    setListenError('');
    setIsPreparingListen(true);
    stopListening();

    const friendlyVoiceMessage =
      language === 'hi'
        ? 'Selected voice unavailable hai. Hindi/English try karein ya Bhashini connect karein.'
        : 'Selected voice is unavailable. Try Hindi/English or connect Bhashini.';

    try {
      if (!isBhashiniConfigured) {
        await speakWithBrowserFallback(sourceText, friendlyVoiceMessage);
        return;
      }

      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sourceText,
          languageCode: listenLanguageCode,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as TtsResponse;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Bhashini TTS unavailable.');
      }

      const audioUrl = typeof payload.data.audioUrl === 'string' ? payload.data.audioUrl.trim() : '';
      const audioBase64 =
        typeof payload.data.audioBase64 === 'string' ? payload.data.audioBase64.trim() : '';
      const mimeType =
        typeof payload.data.mimeType === 'string' && payload.data.mimeType.trim()
          ? payload.data.mimeType.trim()
          : 'audio/mpeg';

      const src = audioUrl || (audioBase64 ? `data:${mimeType};base64,${audioBase64}` : '');
      if (!src) {
        throw new Error('No audio payload returned.');
      }

      const audio = new Audio(src);
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlayingAudio(false);
      };
      audio.onerror = () => {
        setIsPlayingAudio(false);
        setListenError('Unable to play generated audio.');
      };

      await audio.play();
      setIsPlayingAudio(true);
    } catch {
      await speakWithBrowserFallback(sourceText, friendlyVoiceMessage);
    } finally {
      setIsPreparingListen(false);
    }
  };

  const sendMessage = () => {
    const cleanQuery = draft.trim();
    if (!cleanQuery || isWorking) return;
    setDraft('');
    void runAwarenessSearch(cleanQuery);
  };

  const runDraftSearch = () => {
    if (!draft.trim() || isWorking) return;
    sendMessage();
  };

  const runSummaryAction = () => {
    if (isWorking) return;
    if (currentArticleId) {
      void runSummary('article');
      return;
    }
    void runSummary('text');
  };

  const runTopHeadlines = () => {
    if (isWorking) return;
    const query =
      language === 'hi' ? 'Aaj ki top headlines kya hain?' : 'Top headlines today in India';
    void runAwarenessSearch(query);
  };

  return {
    language,
    draft,
    setDraft,
    messages,
    isWorking,
    errorText,
    searchRouteHref,
    currentArticleId,
    listenLanguageCode,
    setListenLanguageCode,
    listenLanguageOptions,
    isPreparingListen,
    isPlayingAudio,
    listenError,
    messagesEndRef,
    sendMessage,
    runDraftSearch,
    runSummaryAction,
    runTopHeadlines,
    handleListen,
    stopListening: () => stopListening(),
  };
}
