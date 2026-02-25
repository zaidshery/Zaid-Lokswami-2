import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongoose';
import ReaderUser from '@/lib/models/ReaderUser';
import Subscriber from '@/lib/models/Subscriber';
import {
  generateReaderToken,
  setReaderAuthCookie,
  type ReaderTokenPayload,
} from '@/lib/auth/readerToken';
import { getJwtSecretOrNull } from '@/lib/auth/jwtSecret';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const wantsDailyAlerts = Boolean(body?.wantsDailyAlerts);

    if (name.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (password.length < 8 || password.length > 72) {
      return NextResponse.json(
        { success: false, error: 'Password must be between 8 and 72 characters' },
        { status: 400 }
      );
    }

    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { success: false, error: 'Authentication service is not configured yet' },
        { status: 503 }
      );
    }

    if (!getJwtSecretOrNull()) {
      return NextResponse.json(
        { success: false, error: 'Server auth secret is not configured' },
        { status: 503 }
      );
    }

    await connectDB();

    const existing = await ReaderUser.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email is already registered' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await ReaderUser.create({
      name,
      email,
      passwordHash,
      wantsDailyAlerts,
      lastLoginAt: new Date(),
    });

    if (wantsDailyAlerts) {
      const subscriber = await Subscriber.findOne({ email });
      if (!subscriber) {
        await Subscriber.create({
          email,
          sources: ['epaper', 'main'],
          subscribedAt: new Date(),
        });
      } else {
        let changed = false;
        if (!subscriber.sources.includes('epaper')) {
          subscriber.sources.push('epaper');
          changed = true;
        }
        if (!subscriber.sources.includes('main')) {
          subscriber.sources.push('main');
          changed = true;
        }
        if (changed) await subscriber.save();
      }
    }

    const payload: ReaderTokenPayload = {
      userId: created._id.toString(),
      email: created.email,
      role: 'reader',
    };
    const token = generateReaderToken(payload);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: created._id.toString(),
          name: created.name,
          email: created.email,
          wantsDailyAlerts: created.wantsDailyAlerts,
        },
      },
      { status: 201 }
    );
    setReaderAuthCookie(response, token);
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to register. Please try again.' },
      { status: 500 }
    );
  }
}
