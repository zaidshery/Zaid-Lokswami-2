import { Types } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/db/mongoose';
import User from '@/lib/models/User';

function clampCompletionPercent(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const sessionUser = session?.user;
    const sessionEmail = sessionUser?.email?.trim().toLowerCase() || '';

    // Guest traffic is valid for public reading; tracking is a no-op without session.
    if (!sessionUser || !sessionEmail) {
      return NextResponse.json({ success: true, skipped: true, reason: 'guest' });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload' },
        { status: 400 }
      );
    }

    const articleId = String(body.articleId || '').trim();
    if (!articleId || !Types.ObjectId.isValid(articleId)) {
      return NextResponse.json(
        { success: false, error: 'Valid articleId is required' },
        { status: 400 }
      );
    }

    const completionPercent = clampCompletionPercent(body.completionPercent);
    const sessionUserId = (sessionUser.userId || sessionUser.id || '').trim();
    const now = new Date();

    await connectDB();

    const userQuery = Types.ObjectId.isValid(sessionUserId)
      ? { _id: sessionUserId }
      : { email: sessionEmail };

    const updatedUser = await User.findOneAndUpdate(
      userQuery,
      {
        $inc: { readCount: 1 },
        $push: {
          readHistory: {
            $each: [
              {
                articleId: new Types.ObjectId(articleId),
                readAt: now,
                completionPercent,
              },
            ],
            $slice: -50,
          },
        },
        $set: { lastActiveAt: now },
      },
      {
        new: true,
        projection: { _id: 1, readCount: 1, lastActiveAt: 1 },
      }
    ).lean<{
      _id: Types.ObjectId;
      readCount?: number;
      lastActiveAt?: Date;
    } | null>();

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          userId: updatedUser._id.toString(),
          readCount:
            typeof updatedUser.readCount === 'number' ? updatedUser.readCount : 0,
          lastActiveAt: updatedUser.lastActiveAt?.toISOString() || now.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to track user read event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track user read event' },
      { status: 500 }
    );
  }
}

