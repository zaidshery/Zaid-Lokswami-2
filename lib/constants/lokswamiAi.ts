export const LOKSWAMI_AI_PILLARS = {
  awareness:
    'We use Semantic RAG (Retrieval-Augmented Generation) so users can ask questions in their native tongue, like Hindi, Marathi, or Hinglish, and get precise results instantly.',
  abridgment:
    'To support users with cognitive or time constraints, our AI generates instant TL;DR summaries, breaking down complex articles into 3 simple, accessible bullet points.',
  audibility:
    "Integrating the Bhashini API, we provide a 'Listen' feature in 22 regional Indian languages, ensuring our content is accessible to the visually impaired and those with reading difficulties.",
} as const;

export type IndianLanguageOption = {
  code: string;
  label: string;
};

export const BHASHINI_LANGUAGE_OPTIONS: IndianLanguageOption[] = [
  { code: 'as-IN', label: 'Assamese' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'brx-IN', label: 'Bodo' },
  { code: 'doi-IN', label: 'Dogri' },
  { code: 'gu-IN', label: 'Gujarati' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'kn-IN', label: 'Kannada' },
  { code: 'ks-IN', label: 'Kashmiri' },
  { code: 'gom-IN', label: 'Konkani' },
  { code: 'mai-IN', label: 'Maithili' },
  { code: 'ml-IN', label: 'Malayalam' },
  { code: 'mni-IN', label: 'Manipuri' },
  { code: 'mr-IN', label: 'Marathi' },
  { code: 'ne-IN', label: 'Nepali' },
  { code: 'or-IN', label: 'Odia' },
  { code: 'pa-IN', label: 'Punjabi' },
  { code: 'sa-IN', label: 'Sanskrit' },
  { code: 'sat-IN', label: 'Santali' },
  { code: 'sd-IN', label: 'Sindhi' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'ur-IN', label: 'Urdu' },
];

export function isSupportedBhashiniLanguage(code: string) {
  return BHASHINI_LANGUAGE_OPTIONS.some((item) => item.code === code);
}
