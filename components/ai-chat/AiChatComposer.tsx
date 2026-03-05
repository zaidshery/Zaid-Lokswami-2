'use client';

import { PauseCircle, SendHorizonal, Volume2 } from 'lucide-react';

type LanguageOption = {
  code: string;
  label: string;
  native?: string;
};

type AiChatComposerProps = {
  draft: string;
  setDraft: (value: string) => void;
  isWorking: boolean;
  onSend: () => void;
  listenLanguageCode: string;
  setListenLanguageCode: (value: string) => void;
  listenLanguageOptions: LanguageOption[];
  onListen: () => void;
  onStop: () => void;
  isPreparingListen: boolean;
  isPlayingAudio: boolean;
  listenError: string;
};

export default function AiChatComposer({
  draft,
  setDraft,
  isWorking,
  onSend,
  listenLanguageCode,
  setListenLanguageCode,
  listenLanguageOptions,
  onListen,
  onStop,
  isPreparingListen,
  isPlayingAudio,
  listenError,
}: AiChatComposerProps) {
  return (
    <div className="sticky bottom-0 border-t border-[#262626] bg-[#151515]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 backdrop-blur">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
        className="flex items-center gap-2"
      >
        <select
          value={listenLanguageCode}
          onChange={(event) => setListenLanguageCode(event.target.value)}
          aria-label="Select language"
          className="h-10 rounded-xl border border-[#262626] bg-[#0B0B0B] px-2 text-xs font-medium text-[#EAEAEA]"
        >
          {listenLanguageOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Sawal poochhiye ya text paste kijiye..."
          className="h-10 min-w-0 flex-1 rounded-xl border border-[#262626] bg-[#0B0B0B] px-3 text-sm text-[#EAEAEA] placeholder:text-zinc-500 focus:border-[#E11D2E] focus:outline-none"
        />

        <button
          type="submit"
          disabled={isWorking || !draft.trim()}
          aria-label="Send message"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E11D2E] text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onListen}
            disabled={isPreparingListen}
            aria-label="Listen to response"
            className="inline-flex items-center gap-1 rounded-full border border-emerald-700/70 bg-emerald-900/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-900/35 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Volume2 className="h-3.5 w-3.5" />
            Listen
          </button>

          <button
            type="button"
            onClick={onStop}
            disabled={!isPlayingAudio && !isPreparingListen}
            aria-label="Stop audio"
            className="inline-flex items-center gap-1 rounded-full border border-[#262626] bg-[#0B0B0B] px-2.5 py-1 text-[11px] font-semibold text-zinc-300 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PauseCircle className="h-3.5 w-3.5" />
            Stop
          </button>
        </div>
      </div>

      {listenError ? <p className="mt-1 text-xs text-red-400">{listenError}</p> : null}
    </div>
  );
}
