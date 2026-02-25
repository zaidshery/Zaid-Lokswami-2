import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongoose';
import ReaderUser from '@/lib/models/ReaderUser';
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
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
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

    const user = await ReaderUser.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    user.lastLoginAt = new Date();
    await user.save();

    const payload: ReaderTokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: 'reader',
    };
    const token = generateReaderToken(payload);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        wantsDailyAlerts: user.wantsDailyAlerts,
      },
    });
    setReaderAuthCookie(response, token);
    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to login. Please try again.' },
      { status: 500 }
    );
  }
}
