export type TtsLanguageOption = {
  code: string;
  label: string;
};

export type TtsVoiceOption = {
  id: string;
  label: string;
};

export const GEMINI_TTS_PROVIDER = 'gemini' as const;
export const GEMINI_TTS_DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts';
export const GEMINI_TTS_DEFAULT_VOICE = 'Sulafat';
export const GEMINI_TTS_OUTPUT_SAMPLE_RATE = 24000;
export const GEMINI_TTS_OUTPUT_MIME_TYPE = 'audio/wav';
export const GEMINI_TTS_MAX_CHARS_PER_CHUNK = 1400;
export const GEMINI_TTS_MAX_TOTAL_CHARS = 9000;

export const GEMINI_TTS_LANGUAGE_OPTIONS: TtsLanguageOption[] = [
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'en-IN', label: 'English' },
  { code: 'bn-IN', label: 'Bangla' },
  { code: 'gu-IN', label: 'Gujarati' },
  { code: 'kn-IN', label: 'Kannada' },
  { code: 'kok-IN', label: 'Konkani' },
  { code: 'mai-IN', label: 'Maithili' },
  { code: 'ml-IN', label: 'Malayalam' },
  { code: 'mr-IN', label: 'Marathi' },
  { code: 'or-IN', label: 'Odia' },
  { code: 'pa-IN', label: 'Punjabi' },
  { code: 'sd-IN', label: 'Sindhi' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'ur-IN', label: 'Urdu' },
];

export const GEMINI_TTS_VOICE_OPTIONS: TtsVoiceOption[] = [
  { id: 'Charon', label: 'Charon · Informative' },
  { id: 'Sadaltager', label: 'Sadaltager · Knowledgeable' },
  { id: 'Iapetus', label: 'Iapetus · Clear' },
  { id: 'Kore', label: 'Kore · Firm' },
  { id: 'Sulafat', label: 'Sulafat · Warm' },
  { id: 'Achird', label: 'Achird · Friendly' },
  { id: 'Algieba', label: 'Algieba · Smooth' },
  { id: 'Achernar', label: 'Achernar · Soft' },
  { id: 'Aoede', label: 'Aoede · Breezy' },
  { id: 'Autonoe', label: 'Autonoe · Bright' },
  { id: 'Callirrhoe', label: 'Callirrhoe · Easy-going' },
  { id: 'Despina', label: 'Despina · Smooth' },
  { id: 'Enceladus', label: 'Enceladus · Breathy' },
  { id: 'Erinome', label: 'Erinome · Clear' },
  { id: 'Fenrir', label: 'Fenrir · Excitable' },
  { id: 'Gacrux', label: 'Gacrux · Mature' },
  { id: 'Laomedeia', label: 'Laomedeia · Upbeat' },
  { id: 'Leda', label: 'Leda · Youthful' },
  { id: 'Orus', label: 'Orus · Firm' },
  { id: 'Puck', label: 'Puck · Upbeat' },
  { id: 'Pulcherrima', label: 'Pulcherrima · Forward' },
  { id: 'Rasalgethi', label: 'Rasalgethi · Informative' },
  { id: 'Sadachbia', label: 'Sadachbia · Lively' },
  { id: 'Schedar', label: 'Schedar · Even' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix · Gentle' },
  { id: 'Zephyr', label: 'Zephyr · Bright' },
  { id: 'Zubenelgenubi', label: 'Zubenelgenubi · Casual' },
  { id: 'Umbriel', label: 'Umbriel · Easy-going' },
  { id: 'Algenib', label: 'Algenib · Gravelly' },
  { id: 'Alnilam', label: 'Alnilam · Firm' },
];

function normalizeCode(value: string) {
  return value.trim().toLowerCase();
}

export function getTtsBaseLanguage(value: string) {
  return normalizeCode(value).split('-')[0] || '';
}

export function isSupportedGeminiTtsLanguage(code: string) {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) {
    return false;
  }

  return GEMINI_TTS_LANGUAGE_OPTIONS.some((item) => {
    const normalizedItemCode = normalizeCode(item.code);
    return (
      normalizedItemCode === normalizedCode ||
      getTtsBaseLanguage(normalizedItemCode) === getTtsBaseLanguage(normalizedCode)
    );
  });
}

export function isSupportedGeminiTtsVoice(voice: string) {
  const normalizedVoice = voice.trim().toLowerCase();
  if (!normalizedVoice) {
    return false;
  }

  return GEMINI_TTS_VOICE_OPTIONS.some((item) => item.id.toLowerCase() === normalizedVoice);
}

export function getGeminiTtsLanguageLabel(code: string) {
  const normalizedCode = normalizeCode(code);
  const exactMatch = GEMINI_TTS_LANGUAGE_OPTIONS.find(
    (item) => normalizeCode(item.code) === normalizedCode
  );

  if (exactMatch) {
    return exactMatch.label;
  }

  const baseLanguage = getTtsBaseLanguage(code);
  const looseMatch = GEMINI_TTS_LANGUAGE_OPTIONS.find(
    (item) => getTtsBaseLanguage(item.code) === baseLanguage
  );

  return looseMatch?.label || 'the selected language';
}
