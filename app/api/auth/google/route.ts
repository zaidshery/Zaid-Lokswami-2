import { randomUUID } from 'crypto';
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

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  exp?: string;
  iss?: string;
  name?: string;
};

function isEmailVerified(value: GoogleTokenInfo['email_verified']) {
  return value === true || value === 'true';
}

function isValidIssuer(value: string | undefined) {
  return value === 'accounts.google.com' || value === 'https://accounts.google.com';
}

async function verifyGoogleIdToken(idToken: string) {
  const googleClientId =
    process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  if (!googleClientId) {
    throw new Error('Google auth is not configured yet');
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { cache: 'no-store' }
  );

  if (!response.ok) return null;

  const payload = (await response.json()) as GoogleTokenInfo;
  if (payload.aud !== googleClientId) return null;
  if (!isValidIssuer(payload.iss)) return null;
  if (!isEmailVerified(payload.email_verified)) return null;
  if (!payload.email) return null;

  const expSeconds = Number.parseInt(String(payload.exp || ''), 10);
  if (Number.isFinite(expSeconds) && expSeconds * 1000 < Date.now()) {
    return null;
  }

  const email = payload.email.trim().toLowerCase();
  const fallbackName = email.split('@')[0] || 'Reader';
  const name = String(payload.name || fallbackName).trim();
  return { email, name: name || fallbackName };
}

async function ensureSubscriber(email: string) {
  const subscriber = await Subscriber.findOne({ email });
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
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idToken = String(body?.idToken || '').trim();
    const wantsDailyAlerts = Boolean(body?.wantsDailyAlerts);

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: 'Missing Google token' },
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

    const profile = await verifyGoogleIdToken(idToken);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Google authentication failed' },
        { status: 401 }
      );
    }

    await connectDB();

    let user = await ReaderUser.findOne({ email: profile.email });
    if (!user) {
      const passwordHash = await bcrypt.hash(`${randomUUID()}-${Date.now()}`, 12);
      user = await ReaderUser.create({
        name: profile.name,
        email: profile.email,
        passwordHash,
        authProvider: 'google',
        wantsDailyAlerts,
        lastLoginAt: new Date(),
      });
    } else {
      let changed = false;
      if (!user.name && profile.name) {
        user.name = profile.name;
        changed = true;
      }
      if (wantsDailyAlerts && !user.wantsDailyAlerts) {
        user.wantsDailyAlerts = true;
        changed = true;
      }
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
        changed = true;
      }
      user.lastLoginAt = new Date();
      changed = true;

      if (changed) {
        await user.save();
      }
    }

    if (wantsDailyAlerts || user.wantsDailyAlerts) {
      await ensureSubscriber(profile.email);
    }

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
        wantsDailyAlerts: Boolean(user.wantsDailyAlerts),
      },
    });
    setReaderAuthCookie(response, token);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'Google auth is not configured yet') {
      return NextResponse.json(
        { success: false, error: message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to authenticate with Google' },
      { status: 500 }
    );
  }
}
