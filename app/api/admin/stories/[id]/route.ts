import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Story from '@/lib/models/Story';
import { Types } from 'mongoose';
import { getAdminSession } from '@/lib/auth/admin';
import type { CreateStoryInput } from '@/lib/storage/storiesFile';
import {
  deleteStoredStory,
  getStoredStoryById,
  updateStoredStory,
} from '@/lib/storage/storiesFile';

function toBoundedDuration(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(2, Math.min(180, parsed));
}

function normalizeStoryUpdate(body: unknown) {
  const source = typeof body === 'object' && body ? (body as Record<string, unknown>) : {};
  const updates: Record<string, unknown> = {};

  if (typeof source.title === 'string') updates.title = source.title.trim();
  if (typeof source.caption === 'string') updates.caption = source.caption.trim();
  if (typeof source.thumbnail === 'string') updates.thumbnail = source.thumbnail.trim();
  if (typeof source.mediaUrl === 'string') updates.mediaUrl = source.mediaUrl.trim();
  if (typeof source.linkUrl === 'string') updates.linkUrl = source.linkUrl.trim();
  if (typeof source.linkLabel === 'string') updates.linkLabel = source.linkLabel.trim();
  if (typeof source.category === 'string') updates.category = source.category.trim();
  if (typeof source.author === 'string') updates.author = source.author.trim();

  if (source.mediaType !== undefined) {
    if (source.mediaType === 'image' || source.mediaType === 'video') {
      updates.mediaType = source.mediaType;
    } else {
      return { updates: null, error: 'Invalid media type' };
    }
  }

  if (source.durationSeconds !== undefined) {
    const duration = toBoundedDuration(source.durationSeconds);
    if (duration === null) return { updates: null, error: 'Invalid duration' };
    updates.durationSeconds = duration;
  }

  if (source.priority !== undefined) {
    const priority = Number.parseInt(String(source.priority), 10);
    if (!Number.isFinite(priority)) return { updates: null, error: 'Invalid priority' };
    updates.priority = priority;
  }

  if (source.views !== undefined) {
    const views = Number.parseInt(String(source.views), 10);
    if (!Number.isFinite(views) || views < 0) {
      return { updates: null, error: 'Invalid views count' };
    }
    updates.views = views;
  }

  if (typeof source.isPublished === 'boolean') {
    updates.isPublished = source.isPublished;
  }

  if (source.publishedAt !== undefined) {
    const publishedAt = new Date(String(source.publishedAt));
    if (Number.isNaN(publishedAt.getTime())) {
      return { updates: null, error: 'Invalid published date' };
    }
    updates.publishedAt = publishedAt;
  }

  if (typeof updates.title === 'string' && updates.title.length > 140) {
    return { updates: null, error: 'Title is too long (max 140 characters)' };
  }

  if (typeof updates.caption === 'string' && updates.caption.length > 300) {
    return { updates: null, error: 'Caption is too long (max 300 characters)' };
  }

  if (typeof updates.linkUrl === 'string' && updates.linkUrl.length > 500) {
    return { updates: null, error: 'Link URL is too long' };
  }

  return { updates, error: null };
}

async function shouldUseFileStore() {
  if (!process.env.MONGODB_URI) return true;

  try {
    await connectDB();
    return false;
  } catch (error) {
    console.error('MongoDB unavailable for story id route, using file store.', error);
    return true;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '';
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
      const story = await getStoredStoryById(id);
      if (!story) {
        return NextResponse.json(
          { success: false, error: 'Story not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: story });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid story ID' },
        { status: 400 }
      );
    }

    const story = (await Story.findById(id).lean()) as
      | (Record<string, unknown> & { isPublished?: boolean })
      | null;

    if (!story) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: story });
  } catch (error) {
    console.error('Error fetching story:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch story' },
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
    const { updates, error } = normalizeStoryUpdate(body);

    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    if (await shouldUseFileStore()) {
      const normalizedForStore = {
        ...updates,
        ...(updates.publishedAt instanceof Date
          ? { publishedAt: updates.publishedAt.toISOString() }
          : {}),
      } as Partial<CreateStoryInput> & {
        durationSeconds?: number;
        priority?: number;
        views?: number;
        publishedAt?: string;
      };
      const story = await updateStoredStory(id, normalizedForStore);
      if (!story) {
        return NextResponse.json(
          { success: false, error: 'Story not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: story,
        message: 'Story updated successfully',
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid story ID' },
        { status: 400 }
      );
    }

    const story = await Story.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!story) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: story,
      message: 'Story updated successfully',
    });
  } catch (error: unknown) {
    console.error('Error updating story:', error);
    const message =
      process.env.NODE_ENV !== 'production'
        ? getErrorMessage(error) || 'Failed to update story'
        : 'Failed to update story';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
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
      const deleted = await deleteStoredStory(id);
      if (!deleted) {
        return NextResponse.json(
          { success: false, error: 'Story not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Story deleted successfully',
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid story ID' },
        { status: 400 }
      );
    }

    const story = await Story.findByIdAndDelete(id);
    if (!story) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Story deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting story:', error);
    const message =
      process.env.NODE_ENV !== 'production'
        ? getErrorMessage(error) || 'Failed to delete story'
        : 'Failed to delete story';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
