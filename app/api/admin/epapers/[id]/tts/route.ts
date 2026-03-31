import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { getAdminSession } from '@/lib/auth/admin';
import connectDB from '@/lib/db/mongoose';
import EPaper from '@/lib/models/EPaper';
import EPaperArticle from '@/lib/models/EPaperArticle';
import TtsAuditEvent from '@/lib/models/TtsAuditEvent';
import { buildEpaperStoryTtsText, ensureTtsAsset } from '@/lib/server/ttsAssets';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parsePageNumber(value: unknown) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return Math.floor(parsed);
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await context.params;
    const epaperId = id.trim();
    if (!Types.ObjectId.isValid(epaperId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid e-paper ID' },
        { status: 400 }
      );
    }

    const epaper = await EPaper.findById(epaperId).select('_id title cityName publishDate');
    if (!epaper) {
      return NextResponse.json(
        { success: false, error: 'E-paper not found' },
        { status: 404 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      pageNumber?: number;
      forceRegenerate?: boolean;
    };
    const pageNumber = parsePageNumber(body.pageNumber);
    const forceRegenerate = Boolean(body.forceRegenerate);

    const stories = await EPaperArticle.find({
      epaperId,
      ...(pageNumber ? { pageNumber } : {}),
    }).select('_id epaperId pageNumber title excerpt contentHtml');

    const result = {
      processed: 0,
      ready: 0,
      failed: 0,
      skipped: 0,
    };

    for (const story of stories) {
      const text = buildEpaperStoryTtsText({
        title: String(story.title || ''),
        excerpt: String(story.excerpt || ''),
        contentHtml: String(story.contentHtml || ''),
      });

      if (!text) {
        result.skipped += 1;
        continue;
      }

      result.processed += 1;
      const ensured = await ensureTtsAsset({
        sourceType: 'epaperArticle',
        sourceId: String(story._id),
        sourceParentId: String(story.epaperId || ''),
        variant: 'epaper_story',
        title: String(story.title || epaper.title || ''),
        text,
        forceRegenerate,
        actor: admin,
        metadata: {
          source: 'admin-epaper-bulk',
          pageNumber: Number(story.pageNumber || 1),
          paperTitle: String(epaper.title || ''),
          cityName: String(epaper.cityName || ''),
          publishDate:
            epaper.publishDate instanceof Date
              ? epaper.publishDate.toISOString()
              : String(epaper.publishDate || ''),
        },
      });

      if (ensured.asset?.status === 'ready' && ensured.asset.audioUrl) {
        result.ready += 1;
      } else {
        result.failed += 1;
      }
    }

    await TtsAuditEvent.create({
      action: forceRegenerate ? 'regenerate' : 'generate',
      result: 'success',
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      message: 'Ran admin e-paper bulk TTS job.',
      metadata: {
        epaperId,
        pageNumber: pageNumber || null,
        forceRegenerate,
        result,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        epaperId,
        pageNumber: pageNumber || null,
        forceRegenerate,
        result,
      },
    });
  } catch (error) {
    console.error('Failed to run admin e-paper TTS job:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate e-paper story audio.' },
      { status: 500 }
    );
  }
}
