import type { RefObject } from 'react';

export type ChatRole = 'assistant' | 'user';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  links?: Array<{ id: string; title: string }>;
};

export type UseAiChatOptions = {
  isOpen: boolean;
};

export type UseAiChatResult = {
  language: 'hi' | 'en';
  draft: string;
  setDraft: (value: string) => void;
  messages: ChatMessage[];
  isWorking: boolean;
  errorText: string;
  searchRouteHref: string;
  currentArticleId: string;
  listenLanguageCode: string;
  setListenLanguageCode: (value: string) => void;
  listenLanguageOptions: Array<{ code: string; label: string; native?: string }>;
  isPreparingListen: boolean;
  isPlayingAudio: boolean;
  listenError: string;
  messagesEndRef: RefObject<HTMLDivElement>;
  sendMessage: () => void;
  runDraftSearch: () => void;
  runSummaryAction: () => void;
  runTopHeadlines: () => void;
  handleListen: () => Promise<void>;
  stopListening: () => void;
};
