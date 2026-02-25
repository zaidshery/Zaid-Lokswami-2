import { NextRequest, NextResponse } from 'next/server';
import { getAiArticleById } from '@/lib/ai/articleCorpus';
import { generateThreePointSummary } from '@/lib/ai/summarizer';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      articleId?: string;
      text?: string;
      language?: 'hi' | 'en';
    };

    const articleId = typeof body.articleId === 'string' ? body.articleId.trim() : '';
    const rawText = typeof body.text === 'string' ? body.text.trim() : '';
    const forcedLanguage = body.language === 'hi' || body.language === 'en' ? body.language : undefined;

    let sourceText = rawText;
    let sourceTitle = '';

    if (!sourceText && articleId) {
      const article = await getAiArticleById(articleId);
      if (article) {
        sourceTitle = article.title;
        sourceText = `${article.summary}\n\n${article.content || ''}`;
      }
    }

    if (!sourceText) {
      return NextResponse.json(
        { success: false, error: 'Provide articleId or text for summarization.' },
        { status: 400 }
      );
    }

    if (sourceText.length > 30000) {
      sourceText = sourceText.slice(0, 30000);
    }

    const summary = await generateThreePointSummary(sourceText, forcedLanguage);

    return NextResponse.json({
      success: true,
      data: {
        sourceTitle,
        language: summary.language,
        mode: summary.mode,
        bullets: summary.bullets,
      },
    });
  } catch (error) {
    console.error('AI summary route failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate summary.' },
      { status: 500 }
    );
  }
}
