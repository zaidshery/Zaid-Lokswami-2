const STOP_WORDS_EN = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'at',
  'by',
  'from',
  'is',
  'are',
  'was',
  'were',
  'be',
  'this',
  'that',
  'it',
  'as',
  'has',
  'have',
  'had',
  'will',
  'would',
  'can',
  'could',
  'should',
]);

const STOP_WORDS_HI = new Set([
  'hai',
  'hain',
  'tha',
  'thi',
  'the',
  'aur',
  'ki',
  'ke',
  'ka',
  'ko',
  'se',
  'mein',
  'par',
  'tak',
  'ke',
  'liye',
  'ye',
  'yah',
  'woh',
  'is',
  'us',
]);

function stripHtml(input: string) {
  return input
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectLanguage(value: string): 'hi' | 'en' {
  return /[\u0900-\u097F]/.test(value) ? 'hi' : 'en';
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function tokensForScoring(text: string) {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
}

function buildTokenWeights(text: string, language: 'hi' | 'en') {
  const stopWords = language === 'hi' ? STOP_WORDS_HI : STOP_WORDS_EN;
  const weights = new Map<string, number>();
  tokensForScoring(text).forEach((token) => {
    if (token.length <= 2 || stopWords.has(token)) return;
    weights.set(token, (weights.get(token) || 0) + 1);
  });
  return weights;
}

function sentenceScore(sentence: string, weights: Map<string, number>) {
  const sentenceTokens = tokensForScoring(sentence);
  let score = 0;
  sentenceTokens.forEach((token) => {
    score += weights.get(token) || 0;
  });

  if (/\d/.test(sentence)) score += 1.4;
  if (sentence.length >= 60 && sentence.length <= 260) score += 0.9;
  return score;
}

function buildFallbackBullets(text: string, language: 'hi' | 'en') {
  const cleaned = stripHtml(text);
  if (!cleaned) {
    return language === 'hi'
      ? ['Is article se summary generate nahi ho paai.']
      : ['Summary could not be generated from this article.'];
  }

  const sentences = splitSentences(cleaned);
  if (!sentences.length) {
    return language === 'hi'
      ? ['Is article se summary generate nahi ho paai.']
      : ['Summary could not be generated from this article.'];
  }

  const weights = buildTokenWeights(cleaned, language);
  const ranked = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: sentenceScore(sentence, weights),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .sort((a, b) => a.index - b.index);

  const bullets: string[] = [];
  ranked.forEach((item) => {
    if (bullets.length >= 3) return;
    const trimmed = item.sentence.trim();
    if (!trimmed) return;
    const alreadyUsed = bullets.some((bullet) => bullet.toLowerCase() === trimmed.toLowerCase());
    if (!alreadyUsed) bullets.push(trimmed);
  });

  if (!bullets.length) {
    bullets.push(sentences[0]);
  }

  return bullets.slice(0, 3);
}

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

async function tryOpenAiSummary(text: string, language: 'hi' | 'en') {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const systemPrompt =
    language === 'hi'
      ? 'Aap Lokswami AI ho. Article ko 3 simple bullets me summarize karo. Har bullet short aur clear ho.'
      : 'You are Lokswami AI. Summarize the article into exactly 3 short and clear bullets.';
  const userPrompt = `${stripHtml(text).slice(0, 8000)}\n\nReturn exactly 3 bullet lines.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 250,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as OpenAiChatResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') return null;

    const bullets = content
      .split('\n')
      .map((line) => line.replace(/^[\s\-*0-9.)]+/, '').trim())
      .filter(Boolean)
      .slice(0, 3);

    if (!bullets.length) return null;
    return bullets;
  } catch (error) {
    console.error('AI summary fallback triggered:', error);
    return null;
  }
}

export async function generateThreePointSummary(source: string, forcedLanguage?: 'hi' | 'en') {
  const detectedLanguage = forcedLanguage || detectLanguage(source);
  const openAiBullets = await tryOpenAiSummary(source, detectedLanguage);
  const bullets = openAiBullets || buildFallbackBullets(source, detectedLanguage);

  return {
    language: detectedLanguage,
    bullets: bullets.slice(0, 3),
    mode: openAiBullets ? 'llm' : 'extractive',
  } as const;
}
