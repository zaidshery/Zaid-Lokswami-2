import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import ReaderUser from '@/lib/models/ReaderUser';
import Subscriber from '@/lib/models/Subscriber';
import {
  clearReaderAuthCookie,
  getReaderTokenFromRequest,
  verifyReaderToken,
} from '@/lib/auth/readerToken';

async function syncSubscriber(email: string, wantsDailyAlerts: boolean) {
  const subscriber = await Subscriber.findOne({ email });

  if (wantsDailyAlerts) {
    if (!subscriber) {
      await Subscriber.create({
        email,
        sources: ['epaper', 'main'],
        subscribedAt: new Date(),
      });
      return;
    }

    let changed = false;
    if (!subscriber.sources.includes('epaper')) {
      subscriber.sources.push('epaper');
      changed = true;
    }
    if (!subscriber.sources.includes('main')) {
      subscriber.sources.push('main');
      changed = true;
    }
    if (changed) {
      await subscriber.save();
    }
    return;
  }

  if (!subscriber) return;

  subscriber.sources = subscriber.sources.filter(
    (source: string) => source !== 'epaper' && source !== 'main'
  );

  if (subscriber.sources.length === 0) {
    await Subscriber.deleteOne({ _id: subscriber._id });
    return;
  }

  await subscriber.save();
}

export async function PATCH(req: NextRequest) {
  try {
    const token = getReaderTokenFromRequest(req);
    const payload = token ? verifyReaderToken(token) : null;

    if (!payload?.userId) {
      const unauthorized = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
      clearReaderAuthCookie(unauthorized);
      return unauthorized;
    }

    const body = await req.json();
    const wantsDailyAlerts = Boolean(body?.wantsDailyAlerts);

    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { success: false, error: 'Authentication service is not configured yet' },
        { status: 503 }
      );
    }

    await connectDB();

    const user = await ReaderUser.findById(payload.userId);
    if (!user) {
      const unauthorized = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
      clearReaderAuthCookie(unauthorized);
      return unauthorized;
    }

    user.wantsDailyAlerts = wantsDailyAlerts;
    await user.save();
    await syncSubscriber(user.email, wantsDailyAlerts);

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        wantsDailyAlerts: user.wantsDailyAlerts,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
