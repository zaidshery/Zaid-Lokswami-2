import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Article from '@/lib/models/Article';
import { fetchAllIndexedContent, type IndexedContent } from '@/lib/ai/contentIndex';
import { generateJSON, isGeminiConfigured } from '@/lib/ai/gemini';
import type { SearchStructuredAnswer } from '@/lib/ai/lokswamiSearchAssistant';

type ActionName = 'explain' | 'translate' | 'top_news' | 'trending_topics';

type ActionRequestBody = {
  action?: ActionName;
  text?: string;
  articleId?: string;
  language?: 'hi' | 'en';
  targetLanguage?: 'hi' | 'en';
};

type GroupedContent = {
  articles: IndexedContent[];
  epapers: IndexedContent[];
  videos: IndexedContent[];
  stories: IndexedContent[];
};

type ActionResponse = {
  success: true;
  action: ActionName;
  answer: string;
  structuredAnswer?: SearchStructuredAnswer;
  followUpSuggestion?: string;
  primaryAction?: {
    label: string;
    url: string;
  } | null;
  content?: GroupedContent;
  data: {
    action: ActionName;
    answer: string;
    structuredAnswer?: SearchStructuredAnswer;
    followUpSuggestion?: string;
    primaryAction?: {
      label: string;
      url: string;
    } | null;
    content?: GroupedContent;
  };
};

type ArticleDoc = {
  _id?: unknown;
  title?: string;
  summary?: string;
  content?: string;
  image?: string;
  category?: string;
  publishedAt?: Date | string;
};

type ExplainResponse = {
  headline?: string;
  summary?: string;
  keyPoints?: string[];
  whyItMatters?: string;
  relatedQuestions?: string[];
};

type TranslateResponse = {
  translatedText?: string;
};

function normalizeId(value: unknown) {
  if (typeof value === 'string') return value;
  if (
    value &&
    typeof value === 'object' &&
    'toString' in value &&
    typeof value.toString === 'function'
  ) {
    return value.toString();
  }
  return '';
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function emptyGroupedContent(): GroupedContent {
  return { articles: [], epapers: [], videos: [], stories: [] };
}

function groupContent(items: IndexedContent[]): GroupedContent {
  return items.reduce<GroupedContent>(
    (groups, item) => {
      if (item.type === 'article') groups.articles.push(item);
      if (item.type === 'epaper') groups.epapers.push(item);
      if (item.type === 'video') groups.videos.push(item);
      if (item.type === 'story') groups.stories.push(item);
      return groups;
    },
    emptyGroupedContent()
  );
}

function trimGroupedContent(items: IndexedContent[]) {
  const counts = { article: 0, epaper: 0, video: 0, story: 0 };
  const selected: IndexedContent[] = [];

  for (const item of items) {
    if (selected.length >= 5) break;
    if (counts[item.type] >= 2) continue;
    counts[item.type] += 1;
    selected.push(item);
  }

  return groupContent(selected);
}

function composeStructuredAnswer(answer: SearchStructuredAnswer, language: 'hi' | 'en') {
  const headlineLabel = language === 'hi' ? 'शीर्षक' : 'Headline';
  const keyPointsLabel = language === 'hi' ? 'मुख्य बिंदु' : 'Key Points';
  const whyItMattersLabel = language === 'hi' ? 'क्यों महत्वपूर्ण है' : 'Why it matters';
  const relatedQuestionsLabel = language === 'hi' ? 'संबंधित सवाल' : 'Related questions';

  return [
    `${headlineLabel}:`,
    answer.headline,
    '',
    answer.summary,
    '',
    `${keyPointsLabel}:`,
    ...answer.keyPoints.map((point) => `- ${point}`),
    '',
    `${whyItMattersLabel}:`,
    answer.whyItMatters,
    '',
    `${relatedQuestionsLabel}:`,
    ...answer.relatedQuestions.map((question) => `- ${question}`),
    ...(answer.fallbackNote ? ['', answer.fallbackNote] : []),
  ]
    .join('\n')
    .trim();
}

async function loadArticleSource(articleId: string) {
  await connectDB();
  const article = (await Article.findById(articleId)
    .select('title summary content image category publishedAt')
    .lean()) as ArticleDoc | null;

  if (!article) {
    return null;
  }

  const id = normalizeId(article._id);
  const title = cleanText(article.title);
  const summary = cleanText(article.summary);
  const content = cleanText(article.content);

  if (!id || (!title && !summary && !content)) {
    return null;
  }

  const text = [title, summary, content.slice(0, 2800)].filter(Boolean).join('\n\n');
  const contentItem: IndexedContent = {
    id,
    type: 'article',
    title: title || 'Lokswami article',
    description: summary || content.slice(0, 180),
    category: cleanText(article.category, 'News'),
    thumbnail: cleanText(article.image, '/placeholders/news-16x9.svg'),
    url: `/main/article/${encodeURIComponent(id)}`,
    date:
      article.publishedAt instanceof Date
        ? article.publishedAt.toISOString()
        : cleanText(article.publishedAt, new Date().toISOString()),
    embedding: [],
  };

  return { text, contentItem };
}

function normalizeStructuredAnswer(
  value: ExplainResponse,
  language: 'hi' | 'en',
  fallbackHeadline: string
): SearchStructuredAnswer {
  const keyPoints = Array.isArray(value.keyPoints)
    ? value.keyPoints.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0
      )
    : [];
  const relatedQuestions = Array.isArray(value.relatedQuestions)
    ? value.relatedQuestions.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0
      )
    : [];

  return {
    headline: cleanText(value.headline, fallbackHeadline),
    summary:
      cleanText(value.summary) ||
      (language === 'hi'
        ? 'यह विषय सरल और संक्षिप्त रूप में समझाया गया है।'
        : 'This topic has been explained in simple, concise language.'),
    keyPoints:
      keyPoints.slice(0, 5).length > 0
        ? keyPoints.slice(0, 5)
        : language === 'hi'
          ? ['मुख्य तथ्य उपलब्ध सामग्री के आधार पर चुने गए हैं।']
          : ['The key facts are based on the available material.'],
    whyItMatters:
      cleanText(value.whyItMatters) ||
      (language === 'hi'
        ? 'यह समझना जरूरी है क्योंकि इससे खबर का व्यापक संदर्भ साफ होता है।'
        : 'This matters because it helps clarify the broader context of the news.'),
    relatedQuestions:
      relatedQuestions.slice(0, 3).length > 0
        ? relatedQuestions.slice(0, 3)
        : language === 'hi'
          ? ['इसे और सरल भाषा में समझाइए', 'इससे जुड़ी अगली अपडेट क्या है?', 'इस विषय की और खबरें दिखाइए']
          : ['Explain this even more simply.', 'What is the latest development?', 'Show me more coverage on this topic.'],
  };
}

function scoreTopNews(items: IndexedContent[]) {
  return [...items].sort((left, right) => {
    const leftDate = new Date(left.date).getTime() || 0;
    const rightDate = new Date(right.date).getTime() || 0;
    const leftViews = typeof left.views === 'number' ? left.views : 0;
    const rightViews = typeof right.views === 'number' ? right.views : 0;
    const leftPriority =
      (left.tags?.includes('breaking') ? 3 : 0) + (left.tags?.includes('trending') ? 2 : 0);
    const rightPriority =
      (right.tags?.includes('breaking') ? 3 : 0) + (right.tags?.includes('trending') ? 2 : 0);

    if (rightPriority !== leftPriority) return rightPriority - leftPriority;
    if (rightDate !== leftDate) return rightDate - leftDate;
    return rightViews - leftViews;
  });
}

function scoreTrending(items: IndexedContent[]) {
  return [...items].sort((left, right) => {
    const leftViews = typeof left.views === 'number' ? left.views : 0;
    const rightViews = typeof right.views === 'number' ? right.views : 0;
    const leftTrending = left.tags?.includes('trending') ? 1 : 0;
    const rightTrending = right.tags?.includes('trending') ? 1 : 0;
    const leftDate = new Date(left.date).getTime() || 0;
    const rightDate = new Date(right.date).getTime() || 0;

    if (rightTrending !== leftTrending) return rightTrending - leftTrending;
    if (rightViews !== leftViews) return rightViews - leftViews;
    return rightDate - leftDate;
  });
}

function buildDigestPrompt(
  items: IndexedContent[],
  language: 'hi' | 'en',
  mode: 'top_news' | 'trending_topics'
) {
  const contentLines = items
    .map(
      (item) =>
        `- ${item.title} | ${item.category} | ${item.date.slice(0, 10)} | ${item.description}`
    )
    .join('\n');

  const modeInstruction =
    mode === 'top_news'
      ? language === 'hi'
        ? 'आज की मुख्य खबरों का न्यूज़रूम ब्रीफ तैयार करें।'
        : "Create a newsroom brief of today's top news."
      : language === 'hi'
        ? 'आज के ट्रेंडिंग विषयों का न्यूज़रूम ब्रीफ तैयार करें।'
        : "Create a newsroom brief of today's trending topics.";

  return `${modeInstruction}
${language === 'hi' ? 'हिंदी में जवाब दें।' : 'Respond in English.'}
तथ्यात्मक, संक्षिप्त और तटस्थ रहें।

Coverage:
${contentLines}

Respond only in valid JSON:
{
  "headline": "short headline",
  "summary": "short paragraph",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "whyItMatters": "short paragraph",
  "relatedQuestions": ["question 1", "question 2", "question 3"]
}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ActionRequestBody;
    const action = body.action;
    const language = body.language === 'en' ? 'en' : 'hi';

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required.' }, { status: 400 });
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json({ success: false, error: 'AI actions are not configured.' }, { status: 500 });
    }

    if (action === 'translate') {
      const targetLanguage = body.targetLanguage === 'en' ? 'en' : 'hi';
      const articleSource = body.articleId ? await loadArticleSource(body.articleId) : null;
      const sourceText = cleanText(body.text) || articleSource?.text || '';

      if (!sourceText) {
        return NextResponse.json(
          { success: false, error: 'Provide text or articleId for translation.' },
          { status: 400 }
        );
      }

      const translationPrompt = `Translate the following news text into ${
        targetLanguage === 'hi' ? 'Hindi in natural Devanagari' : 'clear English'
      }.
Preserve factual meaning, tone, names, numbers, and chronology.
Do not add explanation.

Text:
${sourceText.slice(0, 3200)}

Respond only in valid JSON:
{
  "translatedText": "translated text here"
}`;

      const result = await generateJSON<TranslateResponse>(translationPrompt);
      const translatedText = cleanText(result.translatedText);

      if (!translatedText) {
        return NextResponse.json({ success: false, error: 'Translation failed.' }, { status: 500 });
      }

      const payload: ActionResponse = {
        success: true,
        action,
        answer: translatedText,
        followUpSuggestion:
          targetLanguage === 'hi'
            ? 'अब इसे सरल भाषा में समझाइए'
            : 'Now explain this in simpler language.',
        primaryAction: articleSource
          ? {
              label: targetLanguage === 'hi' ? 'मूल खबर पढ़ें' : 'Read original story',
              url: articleSource.contentItem.url,
            }
          : null,
        content: articleSource ? groupContent([articleSource.contentItem]) : emptyGroupedContent(),
        data: {
          action,
          answer: translatedText,
          followUpSuggestion:
            targetLanguage === 'hi'
              ? 'अब इसे सरल भाषा में समझाइए'
              : 'Now explain this in simpler language.',
          primaryAction: articleSource
            ? {
                label: targetLanguage === 'hi' ? 'मूल खबर पढ़ें' : 'Read original story',
                url: articleSource.contentItem.url,
              }
            : null,
          content: articleSource ? groupContent([articleSource.contentItem]) : emptyGroupedContent(),
        },
      };

      return NextResponse.json(payload);
    }

    if (action === 'explain') {
      const articleSource = body.articleId ? await loadArticleSource(body.articleId) : null;
      const sourceText = cleanText(body.text) || articleSource?.text || '';

      if (!sourceText) {
        return NextResponse.json(
          { success: false, error: 'Provide text or articleId to explain.' },
          { status: 400 }
        );
      }

      const explainPrompt = `Explain the following news in simple ${
        language === 'hi' ? 'Hindi in natural Devanagari' : 'English'
      }.
Make it easy for a general reader to understand.
Be factual, short, and neutral.

Text:
${sourceText.slice(0, 3200)}

Respond only in valid JSON:
{
  "headline": "short headline",
  "summary": "simple explanation paragraph",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "whyItMatters": "short paragraph",
  "relatedQuestions": ["question 1", "question 2", "question 3"]
}`;

      const result = await generateJSON<ExplainResponse>(explainPrompt);
      const structuredAnswer = normalizeStructuredAnswer(
        result,
        language,
        language === 'hi' ? 'सरल व्याख्या' : 'Simple explanation'
      );
      const answer = composeStructuredAnswer(structuredAnswer, language);
      const content = articleSource ? groupContent([articleSource.contentItem]) : emptyGroupedContent();

      const payload: ActionResponse = {
        success: true,
        action,
        answer,
        structuredAnswer,
        followUpSuggestion: structuredAnswer.relatedQuestions[0],
        primaryAction: articleSource
          ? {
              label: language === 'hi' ? 'पूरी खबर पढ़ें' : 'Read full story',
              url: articleSource.contentItem.url,
            }
          : null,
        content,
        data: {
          action,
          answer,
          structuredAnswer,
          followUpSuggestion: structuredAnswer.relatedQuestions[0],
          primaryAction: articleSource
            ? {
                label: language === 'hi' ? 'पूरी खबर पढ़ें' : 'Read full story',
                url: articleSource.contentItem.url,
              }
            : null,
          content,
        },
      };

      return NextResponse.json(payload);
    }

    const allContent = await fetchAllIndexedContent();
    const ranked = action === 'top_news' ? scoreTopNews(allContent) : scoreTrending(allContent);
    const selectedItems = ranked.slice(0, 8);
    const groupedContent = trimGroupedContent(selectedItems);

    if (!selectedItems.length) {
      return NextResponse.json(
        { success: false, error: 'No content available for this action yet.' },
        { status: 404 }
      );
    }

    const digestPrompt = buildDigestPrompt(selectedItems, language, action);
    const digest = await generateJSON<ExplainResponse>(digestPrompt);
    const structuredAnswer = normalizeStructuredAnswer(
      digest,
      language,
      action === 'top_news'
        ? language === 'hi'
          ? 'आज की मुख्य खबरें'
          : "Today's top news"
        : language === 'hi'
          ? 'आज के ट्रेंडिंग विषय'
          : "Today's trending topics"
    );
    const answer = composeStructuredAnswer(structuredAnswer, language);
    const primaryAction =
      action === 'top_news'
        ? {
            label: language === 'hi' ? 'मुख्य खबरें खोलें' : 'Open top coverage',
            url: '/main/latest',
          }
        : {
            label: language === 'hi' ? 'और ट्रेंडिंग कवरेज देखें' : 'See more trending coverage',
            url: '/main',
          };

    const payload: ActionResponse = {
      success: true,
      action,
      answer,
      structuredAnswer,
      followUpSuggestion: structuredAnswer.relatedQuestions[0],
      primaryAction,
      content: groupedContent,
      data: {
        action,
        answer,
        structuredAnswer,
        followUpSuggestion: structuredAnswer.relatedQuestions[0],
        primaryAction,
        content: groupedContent,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI action failed';
    console.error('[AI Actions] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
