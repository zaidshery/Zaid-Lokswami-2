import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Video from '@/lib/models/Video';
import { Types } from 'mongoose';
import { getAdminSession } from '@/lib/auth/admin';
import { NEWS_CATEGORIES } from '@/lib/constants/newsCategories';
import type { CreateVideoInput } from '@/lib/storage/videosFile';
import {
  deleteStoredVideo,
  getStoredVideoById,
  updateStoredVideo,
} from '@/lib/storage/videosFile';

const VIDEO_CATEGORIES = NEWS_CATEGORIES.map((category) => category.nameEn);

function isValidCategory(value: string) {
  return VIDEO_CATEGORIES.includes(value);
}

function getYouTubeId(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace('www.', '').toLowerCase();

    if (host === 'youtu.be') return url.pathname.slice(1) || null;
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || null;
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || null;
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeVideoUpdate(body: unknown) {
  const source = typeof body === 'object' && body ? (body as Record<string, unknown>) : {};
  const updates: Record<string, unknown> = {};

  if (typeof source.title === 'string') updates.title = source.title.trim();
  if (typeof source.description === 'string') updates.description = source.description.trim();
  if (typeof source.thumbnail === 'string') updates.thumbnail = source.thumbnail.trim();
  if (typeof source.videoUrl === 'string') {
    const videoUrl = source.videoUrl.trim();
    if (!videoUrl || !getYouTubeId(videoUrl)) {
      return { updates: null, error: 'Video URL must be a valid YouTube URL' };
    }
    updates.videoUrl = videoUrl;
  }

  if (typeof source.category === 'string') {
    const category = source.category.trim();
    if (!isValidCategory(category)) {
      return { updates: null, error: 'Invalid category' };
    }
    updates.category = category;
  }

  if (source.duration !== undefined) {
    const duration = Number.parseInt(String(source.duration), 10);
    if (!Number.isFinite(duration) || duration < 1) {
      return { updates: null, error: 'Invalid duration' };
    }
    updates.duration = duration;
  }

  if (typeof source.isShort === 'boolean') {
    updates.isShort = source.isShort;
  }

  if (typeof source.isPublished === 'boolean') {
    updates.isPublished = source.isPublished;
  }

  if (source.shortsRank !== undefined) {
    const shortsRank = Number.parseInt(String(source.shortsRank), 10);
    if (!Number.isFinite(shortsRank)) {
      return { updates: null, error: 'Invalid shorts rank' };
    }
    updates.shortsRank = shortsRank;
  }

  if (source.views !== undefined) {
    const views = Number.parseInt(String(source.views), 10);
    if (!Number.isFinite(views) || views < 0) {
      return { updates: null, error: 'Invalid views count' };
    }
    updates.views = views;
  }

  if (source.publishedAt !== undefined) {
    const publishedAt = new Date(String(source.publishedAt));
    if (Number.isNaN(publishedAt.getTime())) {
      return { updates: null, error: 'Invalid published date' };
    }
    updates.publishedAt = publishedAt;
  }

  return { updates, error: null };
}

async function shouldUseFileStore() {
  if (!process.env.MONGODB_URI) return true;

  try {
    await connectDB();
    return false;
  } catch (error) {
    console.error('MongoDB unavailable for video id route, using file store.', error);
    return true;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '';
}

function applyAutoThumbnail(updates: Record<string, unknown>) {
  if (
    typeof updates.videoUrl === 'string' &&
    (updates.thumbnail === undefined || String(updates.thumbnail).trim() === '')
  ) {
    const youtubeId = getYouTubeId(updates.videoUrl);
    if (youtubeId) {
      updates.thumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    }
  }
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const user = await getAdminSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (await shouldUseFileStore()) {
      const video = await getStoredVideoById(id);
      if (!video) {
        return NextResponse.json(
          { success: false, error: 'Video not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: video });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    const video = (await Video.findById(id).lean()) as
      | (Record<string, unknown> & { isPublished?: boolean })
      | null;

    if (!video) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: video });
  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch video' },
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
    const user = await getAdminSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { updates, error } = normalizeVideoUpdate(body);

    if (error) {
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    applyAutoThumbnail(updates);

    if (await shouldUseFileStore()) {
      const normalizedForFileStore = {
        ...updates,
        ...(updates.publishedAt instanceof Date
          ? { publishedAt: updates.publishedAt.toISOString() }
          : {}),
      } as Partial<CreateVideoInput> & { publishedAt?: string; updatedAt?: string };

      const video = await updateStoredVideo(id, normalizedForFileStore);

      if (!video) {
        return NextResponse.json(
          { success: false, error: 'Video not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Video updated successfully',
        data: video,
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    const video = await Video.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!video) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Video updated successfully',
      data: video,
    });
  } catch (error: unknown) {
    console.error('Error updating video:', error);
    const message =
      process.env.NODE_ENV !== 'production'
        ? getErrorMessage(error) || 'Failed to update video'
        : 'Failed to update video';
    return NextResponse.json(
      { success: false, error: message },
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
    const user = await getAdminSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (await shouldUseFileStore()) {
      const deleted = await deleteStoredVideo(id);
      if (!deleted) {
        return NextResponse.json(
          { success: false, error: 'Video not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Video deleted successfully',
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    const video = await Video.findByIdAndDelete(id);

    if (!video) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting video:', error);
    const message =
      process.env.NODE_ENV !== 'production'
        ? getErrorMessage(error) || 'Failed to delete video'
        : 'Failed to delete video';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
