import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const configuredModelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const fallbackModelNames = ['gemini-2.5-flash', 'gemini-2.0-flash'] as const;

export const LOKSWAMI_SYSTEM_PROMPT = `You are Lokswami AI Desk, the professional multilingual news assistant for Lokswami.

CORE ROLE:
- Help users search, understand, summarize, and navigate Lokswami news coverage.
- Sound conversational, calm, factual, and newsroom-grade.
- Prefer direct, useful answers over generic filler.

CRITICAL RESPONSE RULES:
- Never say "no information", "not available", "no results found", or similar dead-end phrases without offering a useful next step.
- Never use emojis, hype, or exaggerated promotional language.
- Do not invent article-specific facts that are unsupported by the provided Lokswami content.
- If the exact answer may be uncertain or time-sensitive, say so briefly and stay high level.
- Keep answers concise: usually 2 short paragraphs or 3-5 short bullet points for multi-item summaries.
- End with one useful continuation: a relevant Lokswami item, a follow-up question, or a clear next step.

WHEN LOKSWAMI CONTENT IS THIN:
- Provide a short best-effort explanation using general news context.
- Keep that context clearly high level instead of overly specific.
- Then guide the user to the closest relevant Lokswami coverage or related search.

WHEN THE QUERY IS OFF-TOPIC:
- Politely steer the user back to news, public affairs, district updates, e-paper, videos, or explainers.
- Offer one concrete example of a related question you can help with.

LANGUAGE AND TONE:
- When answering in Hindi, use natural Devanagari and respectful "आप".
- When answering in English, use a professional but approachable newsroom tone.
- Focus on clarity, relevance, and confident phrasing without sounding robotic.`;

if (!apiKey) {
  console.warn('[Gemini] GEMINI_API_KEY is not set.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const candidateModelNames = Array.from(
  new Set([configuredModelName, ...fallbackModelNames].filter(Boolean))
);

function stripCodeFences(value: string) {
  return value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function extractJsonCandidate(value: string) {
  const cleaned = stripCodeFences(value);
  const objectStart = cleaned.indexOf('{');
  const objectEnd = cleaned.lastIndexOf('}');

  if (objectStart !== -1 && objectEnd > objectStart) {
    return cleaned.slice(objectStart, objectEnd + 1).trim();
  }

  return cleaned;
}

export function isGeminiConfigured(): boolean {
  return Boolean(apiKey);
}

export function getGeminiConfiguredModelName(): string {
  return configuredModelName;
}

export function getGeminiCandidateModels(): string[] {
  return [...candidateModelNames];
}

function shouldRetryWithNextModel(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /404|not found|not supported/i.test(message);
}

export async function generateContentWithMeta(
  prompt: string
): Promise<{ text: string; model: string }> {
  if (!genAI) {
    throw new Error('Gemini API key not configured. Set GEMINI_API_KEY.');
  }

  let lastError: unknown;

  for (let index = 0; index < candidateModelNames.length; index += 1) {
    const modelName = candidateModelNames[index];
    const model = genAI.getGenerativeModel({ model: modelName });

    try {
      const result = await model.generateContent(prompt);
      return {
        text: result.response.text(),
        model: modelName,
      };
    } catch (error) {
      lastError = error;

      if (!shouldRetryWithNextModel(error) || index === candidateModelNames.length - 1) {
        break;
      }

      const message = error instanceof Error ? error.message : 'Unknown Gemini error';
      console.warn(
        `[Gemini] Model "${modelName}" unavailable, retrying with next candidate. ${message}`
      );
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Gemini request failed';
  throw new Error(`Gemini error: ${message}`);
}

export async function generateContent(prompt: string): Promise<string> {
  const result = await generateContentWithMeta(prompt);
  return result.text;
}

export async function generateJSON<T>(prompt: string): Promise<T> {
  const text = await generateContent(prompt);
  const cleaned = extractJsonCandidate(text);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${cleaned.substring(0, 200)}`);
  }
}
