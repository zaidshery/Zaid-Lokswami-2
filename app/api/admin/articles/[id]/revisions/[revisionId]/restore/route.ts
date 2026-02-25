import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import Article from '@/lib/models/Article';
import { verifyAdminToken } from '@/lib/auth/adminToken';
import { restoreStoredArticleRevision } from '@/lib/storage/articlesFile';

async function shouldUseFileStore() {
  if (!process.env.MONGODB_URI) return true;

  try {
    await connectDB();
    return false;
  } catch (error) {
    console.error(
      'MongoDB unavailable for article revision restore route, using file store.',
      error
    );
    return true;
  }
}

function normalizeSeo(input: unknown) {
  const source = typeof input === 'object' && input ? (input as Record<string, unknown>) : {};
  return {
    metaTitle: typeof source.metaTitle === 'string' ? source.metaTitle : '',
    metaDescription: typeof source.metaDescription === 'string' ? source.metaDescription : '',
    ogImage: typeof source.ogImage === 'string' ? source.ogImage : '',
    canonicalUrl: typeof source.canonicalUrl === 'string' ? source.canonicalUrl : '',
  };
}

function buildRevisionSnapshot(article: Record<string, unknown>) {
  return {
    title: typeof article.title === 'string' ? article.title : '',
    summary: typeof article.summary === 'string' ? article.summary : '',
    content: typeof article.content === 'string' ? article.content : '',
    image: typeof article.image === 'string' ? article.image : '',
    category: typeof article.category === 'string' ? article.category : '',
    author: typeof article.author === 'string' ? article.author : '',
    isBreaking: Boolean(article.isBreaking),
    isTrending: Boolean(article.isTrending),
    seo: normalizeSeo(article.seo),
    savedAt: new Date(),
  };
}

type RouteContext = {
  params: Promise<{ id: string; revisionId: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = verifyAdminToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, revisionId } = await context.params;

    if (await shouldUseFileStore()) {
      const restored = await restoreStoredArticleRevision(id, revisionId);
      if (!restored) {
        return NextResponse.json(
          { success: false, error: 'Article or revision not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: restored,
        message: 'Revision restored successfully',
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    const article = (await Article.findById(id).lean()) as
      | (Record<string, unknown> & {
          revisions?: Array<Record<string, unknown> & { _id?: unknown }>;
        })
      | null;
    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    const revisions = Array.isArray(article.revisions) ? article.revisions : [];
    const targetRevision = revisions.find(
      (revision: Record<string, unknown> & { _id?: unknown }) =>
        String(revision._id || '') === revisionId
    ) as Record<string, unknown> | undefined;

    if (!targetRevision) {
      return NextResponse.json(
        { success: false, error: 'Revision not found' },
        { status: 404 }
      );
    }

    const snapshot = buildRevisionSnapshot(article as unknown as Record<string, unknown>);
    const restoredArticle = await Article.findByIdAndUpdate(
      id,
      {
        $set: {
          title: typeof targetRevision.title === 'string' ? targetRevision.title : '',
          summary: typeof targetRevision.summary === 'string' ? targetRevision.summary : '',
          content: typeof targetRevision.content === 'string' ? targetRevision.content : '',
          image: typeof targetRevision.image === 'string' ? targetRevision.image : '',
          category:
            typeof targetRevision.category === 'string' ? targetRevision.category : '',
          author: typeof targetRevision.author === 'string' ? targetRevision.author : '',
          isBreaking: Boolean(targetRevision.isBreaking),
          isTrending: Boolean(targetRevision.isTrending),
          seo: normalizeSeo(targetRevision.seo),
          updatedAt: new Date(),
        },
        $push: { revisions: { $each: [snapshot], $slice: -30 } },
      },
      { new: true, runValidators: true }
    );

    if (!restoredArticle) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: restoredArticle,
      message: 'Revision restored successfully',
    });
  } catch (error) {
    console.error('Error restoring article revision:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to restore revision' },
      { status: 500 }
    );
  }
}
