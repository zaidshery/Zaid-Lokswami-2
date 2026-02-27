import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import Article from '@/lib/models/Article';
import EPaper from '@/lib/models/EPaper';
import EPaperArticle from '@/lib/models/EPaperArticle';
import { verifyAdminToken } from '@/lib/auth/adminToken';
import {
  deleteStoredArticle,
  getStoredArticleById,
  updateStoredArticle,
} from '@/lib/storage/articlesFile';
import {
  normalizeHotspot,
  resolveUniqueSlug,
  validateHotspot,
} from '@/lib/utils/epaperArticles';
import { isAllowedAssetPath } from '@/lib/utils/epaperStorage';
import { resolveArticleOgImageUrl } from '@/lib/utils/articleMedia';

type NormalizedSeo = {
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  canonicalUrl: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeSeo(input: unknown): NormalizedSeo {
  const source = typeof input === 'object' && input ? (input as Record<string, unknown>) : {};
  return {
    metaTitle: typeof source.metaTitle === 'string' ? source.metaTitle.trim() : '',
    metaDescription:
      typeof source.metaDescription === 'string' ? source.metaDescription.trim() : '',
    ogImage: typeof source.ogImage === 'string' ? source.ogImage.trim() : '',
    canonicalUrl: typeof source.canonicalUrl === 'string' ? source.canonicalUrl.trim() : '',
  };
}

function normalizeSeoPartial(input: unknown): Partial<NormalizedSeo> {
  const source = typeof input === 'object' && input ? (input as Record<string, unknown>) : {};
  const partial: Partial<NormalizedSeo> = {};
  if (typeof source.metaTitle === 'string') partial.metaTitle = source.metaTitle.trim();
  if (typeof source.metaDescription === 'string') {
    partial.metaDescription = source.metaDescription.trim();
  }
  if (typeof source.ogImage === 'string') partial.ogImage = source.ogImage.trim();
  if (typeof source.canonicalUrl === 'string') partial.canonicalUrl = source.canonicalUrl.trim();
  return partial;
}

function isValidAbsoluteHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function shouldUseFileStore() {
  if (!process.env.MONGODB_URI) return true;

  try {
    await connectDB();
    return false;
  } catch (error) {
    console.error('MongoDB unavailable for article id route, using file store.', error);
    return true;
  }
}

function normalizePartialInput(body: unknown) {
  const source = typeof body === 'object' && body ? (body as Record<string, unknown>) : {};
  const seo = normalizeSeoPartial(source.seo);
  const hasSeo = Object.keys(seo).length > 0;
  return {
    ...(typeof source.title === 'string' ? { title: source.title.trim() } : {}),
    ...(typeof source.summary === 'string' ? { summary: source.summary.trim() } : {}),
    ...(typeof source.content === 'string' ? { content: source.content.trim() } : {}),
    ...(typeof source.image === 'string' ? { image: source.image.trim() } : {}),
    ...(typeof source.category === 'string' ? { category: source.category.trim() } : {}),
    ...(typeof source.author === 'string' ? { author: source.author.trim() } : {}),
    ...(source.isBreaking !== undefined ? { isBreaking: Boolean(source.isBreaking) } : {}),
    ...(source.isTrending !== undefined ? { isTrending: Boolean(source.isTrending) } : {}),
    ...(hasSeo ? { seo } : {}),
  };
}

function validateLengths(input: Record<string, unknown>) {
  if (typeof input.title === 'string' && input.title.length > 200) {
    return 'Title is too long (max 200 characters)';
  }
  if (typeof input.summary === 'string' && input.summary.length > 500) {
    return 'Summary is too long (max 500 characters)';
  }

  const seo =
    typeof input.seo === 'object' && input.seo
      ? (input.seo as Record<string, unknown>)
      : null;
  if (seo) {
    if (typeof seo.metaTitle === 'string' && seo.metaTitle.length > 160) {
      return 'SEO title is too long (max 160 characters)';
    }
    if (
      typeof seo.metaDescription === 'string' &&
      seo.metaDescription.length > 320
    ) {
      return 'SEO description is too long (max 320 characters)';
    }
    if (
      typeof seo.canonicalUrl === 'string' &&
      seo.canonicalUrl &&
      !isValidAbsoluteHttpUrl(seo.canonicalUrl)
    ) {
      return 'Canonical URL must be a valid absolute URL';
    }
    if (
      typeof seo.ogImage === 'string' &&
      seo.ogImage &&
      !isValidAbsoluteHttpUrl(seo.ogImage) &&
      !seo.ogImage.startsWith('/')
    ) {
      return 'OG image must be an absolute URL or local path';
    }
  }

  return null;
}

function normalizeFullInput(body: unknown) {
  const source = typeof body === 'object' && body ? (body as Record<string, unknown>) : {};
  const image = typeof source.image === 'string' ? source.image.trim() : '';
  const seo = normalizeSeo(source.seo);
  if (!seo.ogImage && image) {
    seo.ogImage = resolveArticleOgImageUrl({ image });
  }

  return {
    title: typeof source.title === 'string' ? source.title.trim() : '',
    summary: typeof source.summary === 'string' ? source.summary.trim() : '',
    content: typeof source.content === 'string' ? source.content.trim() : '',
    image,
    category: typeof source.category === 'string' ? source.category.trim() : '',
    author: typeof source.author === 'string' ? source.author.trim() : '',
    isBreaking: Boolean(source.isBreaking),
    isTrending: Boolean(source.isTrending),
    seo,
  };
}

function validateRequired(input: ReturnType<typeof normalizeFullInput>) {
  if (
    !input.title ||
    !input.summary ||
    !input.content ||
    !input.image ||
    !input.category ||
    !input.author
  ) {
    return 'Missing required fields';
  }
  return validateLengths(input);
}

function buildRevisionSnapshot(article: Record<string, unknown>) {
  const seo =
    typeof article.seo === 'object' && article.seo
      ? normalizeSeo(article.seo)
      : normalizeSeo(null);

  return {
    title: typeof article.title === 'string' ? article.title : '',
    summary: typeof article.summary === 'string' ? article.summary : '',
    content: typeof article.content === 'string' ? article.content : '',
    image: typeof article.image === 'string' ? article.image : '',
    category: typeof article.category === 'string' ? article.category : '',
    author: typeof article.author === 'string' ? article.author : '',
    isBreaking: Boolean(article.isBreaking),
    isTrending: Boolean(article.isTrending),
    seo,
    savedAt: new Date(),
  };
}

function parsePositiveInt(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return Math.floor(parsed);
}

function mapEpaperArticle(article: unknown) {
  const source = typeof article === 'object' && article ? (article as Record<string, unknown>) : {};
  const hotspot =
    typeof source.hotspot === 'object' && source.hotspot
      ? (source.hotspot as Record<string, unknown>)
      : {};

  return {
    _id: String(source._id || ''),
    epaperId: String(source.epaperId || ''),
    pageNumber: Number(source.pageNumber || 1),
    title: String(source.title || ''),
    slug: String(source.slug || ''),
    excerpt: String(source.excerpt || ''),
    contentHtml: String(source.contentHtml || ''),
    coverImagePath: String(source.coverImagePath || ''),
    hotspot: {
      x: Number(hotspot.x || 0),
      y: Number(hotspot.y || 0),
      w: Number(hotspot.w || 0),
      h: Number(hotspot.h || 0),
    },
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function isEpaperKind(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get('kind');
  return kind === 'epaper';
}

function normalizeEpaperArticleInput(body: unknown) {
  const source = typeof body === 'object' && body ? (body as Record<string, unknown>) : {};
  return {
    title: typeof source.title === 'string' ? source.title.trim() : '',
    slug: typeof source.slug === 'string' ? source.slug.trim() : '',
    excerpt: typeof source.excerpt === 'string' ? source.excerpt.trim() : '',
    contentHtml: typeof source.contentHtml === 'string' ? source.contentHtml.trim() : '',
    coverImagePath:
      typeof source.coverImagePath === 'string' ? source.coverImagePath.trim() : '',
    pageNumber:
      source.pageNumber !== undefined ? parsePositiveInt(source.pageNumber) : 0,
    hotspot: source.hotspot !== undefined ? normalizeHotspot(source.hotspot) : null,
  };
}

function validateEpaperArticleInput(
  input: ReturnType<typeof normalizeEpaperArticleInput>,
  isPut: boolean
) {
  if (isPut && !input.title) {
    return 'title is required';
  }
  if (input.title && input.title.length > 220) {
    return 'title is too long (max 220 chars)';
  }
  if (input.excerpt.length > 1000) {
    return 'excerpt is too long (max 1000 chars)';
  }
  if (input.pageNumber < 0) {
    return 'pageNumber must be positive';
  }
  if (input.hotspot) {
    const hotspotError = validateHotspot(input.hotspot);
    if (hotspotError) return hotspotError;
  } else if (isPut) {
    return 'hotspot is required';
  }

  if (input.coverImagePath) {
    const validCoverImage =
      input.coverImagePath.startsWith('/')
        ? isAllowedAssetPath(input.coverImagePath)
        : isValidAbsoluteHttpUrl(input.coverImagePath);
    if (!validCoverImage) {
      return 'coverImagePath must be a valid /uploads path or absolute URL';
    }
  }

  return null;
}

async function findEpaperArticle(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return EPaperArticle.findById(id).lean();
}

async function updateEpaperArticleById(
  id: string,
  body: unknown,
  isPut: boolean
) {
  if (!Types.ObjectId.isValid(id)) {
    return {
      ok: false as const,
      status: 400,
      payload: { success: false, error: 'Invalid article ID' },
    };
  }

  await connectDB();
  const current = await EPaperArticle.findById(id).lean();
  if (!current) {
    return {
      ok: false as const,
      status: 404,
      payload: { success: false, error: 'Article not found' },
    };
  }

  const input = normalizeEpaperArticleInput(body);
  const validationError = validateEpaperArticleInput(input, isPut);
  if (validationError) {
    return {
      ok: false as const,
      status: 400,
      payload: { success: false, error: validationError },
    };
  }

  const updates: Record<string, unknown> = {};

  if (input.title) updates.title = input.title;
  if (input.excerpt || input.excerpt === '') updates.excerpt = input.excerpt;
  if (input.contentHtml || input.contentHtml === '') updates.contentHtml = input.contentHtml;
  if (input.coverImagePath || input.coverImagePath === '') updates.coverImagePath = input.coverImagePath;
  if (input.pageNumber > 0) updates.pageNumber = input.pageNumber;
  if (input.hotspot) updates.hotspot = input.hotspot;

  const nextTitle = input.title || current.title;
  const shouldRecomputeSlug = Boolean(input.slug || input.title);
  if (shouldRecomputeSlug) {
    const nextSlug = await resolveUniqueSlug(input.slug || nextTitle, async (candidate) => {
      const existing = await EPaperArticle.findOne({
        _id: { $ne: id },
        epaperId: current.epaperId,
        slug: candidate,
      })
        .select('_id')
        .lean();
      return Boolean(existing);
    });
    updates.slug = nextSlug;
  }

  if (updates.pageNumber !== undefined) {
    const epaper = await EPaper.findById(current.epaperId).select('pageCount').lean();
    const pageCount = Number(epaper?.pageCount || 0);
    const pageNumber = Number(updates.pageNumber || 0);
    if (pageCount > 0 && pageNumber > pageCount) {
      return {
        ok: false as const,
        status: 400,
        payload: {
          success: false,
          error: `pageNumber must be between 1 and ${pageCount}`,
        },
      };
    }
  }

  const updated = await EPaperArticle.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updated) {
    return {
      ok: false as const,
      status: 404,
      payload: { success: false, error: 'Article not found' },
    };
  }

  return {
    ok: true as const,
    status: 200,
    payload: { success: true, data: mapEpaperArticle(updated) },
  };
}

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (isEpaperKind(req)) {
      await connectDB();
      const epaperArticle = await findEpaperArticle(id);
      if (!epaperArticle) {
        return NextResponse.json(
          { success: false, error: 'Article not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: mapEpaperArticle(epaperArticle) });
    }

    if (await shouldUseFileStore()) {
      const article = await getStoredArticleById(id);
      if (!article) {
        return NextResponse.json(
          { success: false, error: 'Article not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: article });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    const article = await Article.findById(id).lean();
    if (article) {
      return NextResponse.json({ success: true, data: article });
    }

    const epaperArticle = await findEpaperArticle(id);
    if (epaperArticle) {
      return NextResponse.json({ success: true, data: mapEpaperArticle(epaperArticle) });
    }

    return NextResponse.json(
      { success: false, error: 'Article not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const user = verifyAdminToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (isEpaperKind(req)) {
      const result = await updateEpaperArticleById(id, body, false);
      return NextResponse.json(result.payload, { status: result.status });
    }

    const updates = normalizePartialInput(body);
    const validationError = validateLengths(updates);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    if (await shouldUseFileStore()) {
      const article = await updateStoredArticle(id, updates);
      if (!article) {
        return NextResponse.json(
          { success: false, error: 'Article not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: article });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    const current = await Article.findById(id).lean();
    if (!current) {
      const fallback = await updateEpaperArticleById(id, body, false);
      return NextResponse.json(fallback.payload, { status: fallback.status });
    }

    const revision = buildRevisionSnapshot(current as Record<string, unknown>);
    const article = await Article.findByIdAndUpdate(
      id,
      {
        $set: { ...updates, updatedAt: new Date() },
        $push: { revisions: { $each: [revision], $slice: -30 } },
      },
      { new: true, runValidators: true }
    );

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    console.error('Error patching article:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update article' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const user = verifyAdminToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (isEpaperKind(req)) {
      const result = await updateEpaperArticleById(id, body, true);
      return NextResponse.json(result.payload, { status: result.status });
    }

    const input = normalizeFullInput(body);
    const validationError = validateRequired(input);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    if (await shouldUseFileStore()) {
      const article = await updateStoredArticle(id, input);
      if (!article) {
        return NextResponse.json(
          { success: false, error: 'Article not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: article,
        message: 'Article updated successfully',
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    const current = await Article.findById(id).lean();
    if (!current) {
      const fallback = await updateEpaperArticleById(id, body, true);
      return NextResponse.json(fallback.payload, { status: fallback.status });
    }

    const revision = buildRevisionSnapshot(current as Record<string, unknown>);
    const article = await Article.findByIdAndUpdate(
      id,
      {
        $set: { ...input, updatedAt: new Date() },
        $push: { revisions: { $each: [revision], $slice: -30 } },
      },
      { new: true, runValidators: true }
    );

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: article,
      message: 'Article updated successfully',
    });
  } catch (error) {
    console.error('Error putting article:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update article' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const user = verifyAdminToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (isEpaperKind(req)) {
      await connectDB();
      if (!Types.ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, error: 'Invalid article ID' },
          { status: 400 }
        );
      }
      const deleted = await EPaperArticle.findByIdAndDelete(id).lean();
      if (!deleted) {
        return NextResponse.json(
          { success: false, error: 'Article not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Article deleted successfully',
      });
    }

    if (await shouldUseFileStore()) {
      const deleted = await deleteStoredArticle(id);
      if (!deleted) {
        return NextResponse.json(
          { success: false, error: 'Article not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Article deleted successfully',
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    const article = await Article.findByIdAndDelete(id).lean();
    if (article) {
      return NextResponse.json({
        success: true,
        message: 'Article deleted successfully',
      });
    }

    const epaperArticle = await EPaperArticle.findByIdAndDelete(id).lean();
    if (epaperArticle) {
      return NextResponse.json({
        success: true,
        message: 'Article deleted successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Article not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error deleting article:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}
