import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import Article from '@/lib/models/Article';
import { verifyAdminToken } from '@/lib/auth/adminToken';
import { listStoredArticleRevisions } from '@/lib/storage/articlesFile';

async function shouldUseFileStore() {
  if (!process.env.MONGODB_URI) return true;

  try {
    await connectDB();
    return false;
  } catch (error) {
    console.error('MongoDB unavailable for article revisions route, using file store.', error);
    return true;
  }
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = verifyAdminToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (await shouldUseFileStore()) {
      const revisions = await listStoredArticleRevisions(id);
      if (!revisions) {
        return NextResponse.json(
          { success: false, error: 'Article not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: revisions });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    const article = (await Article.findById(id).select('revisions').lean()) as
      | { revisions?: Array<{ savedAt?: string | Date }> }
      | null;
    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    const revisions = Array.isArray(article.revisions) ? [...article.revisions] : [];
    revisions.sort(
      (a, b) =>
        new Date(String(b.savedAt || '')).getTime() -
        new Date(String(a.savedAt || '')).getTime()
    );

    return NextResponse.json({ success: true, data: revisions });
  } catch (error) {
    console.error('Error fetching article revisions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch revisions' },
      { status: 500 }
    );
  }
}
