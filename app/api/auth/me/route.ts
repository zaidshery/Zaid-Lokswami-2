import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import ReaderUser from '@/lib/models/ReaderUser';
import {
  clearReaderAuthCookie,
  getReaderTokenFromRequest,
  verifyReaderToken,
} from '@/lib/auth/readerToken';

export async function GET(req: NextRequest) {
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

    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { success: false, error: 'Authentication service is not configured yet' },
        { status: 503 }
      );
    }

    await connectDB();

    const user = await ReaderUser.findById(payload.userId).lean();
    if (!user) {
      const unauthorized = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
      clearReaderAuthCookie(unauthorized);
      return unauthorized;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        wantsDailyAlerts: Boolean(user.wantsDailyAlerts),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}

