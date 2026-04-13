import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import { isPubliclyPublishedArticle } from '@/lib/content/articlePublication';
import Article from '@/lib/models/Article';
import { getStoredArticleById } from '@/lib/storage/articlesFile';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function shouldUseFileStore() {
  if (!process.env.MONGODB_URI) {
    return true;
  }

  try {
    await connectDB();
    return false;
  } catch (error) {
    console.error('MongoDB unavailable for public article detail, using file store.', error);
    return true;
  }
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const articleId = id.trim();

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    if (await shouldUseFileStore()) {
      const stored = await getStoredArticleById(articleId);
      if (!stored || !isPubliclyPublishedArticle(stored)) {
        return NextResponse.json(
          { success: false, error: 'Article not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: stored });
    }

    if (!Types.ObjectId.isValid(articleId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    const article = await Article.findById(articleId).lean();
    if (!article || !isPubliclyPublishedArticle(article)) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    console.error('Failed to load public article detail:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

