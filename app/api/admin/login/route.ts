import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getJwtSecretOrNull } from '@/lib/auth/jwtSecret';

const ADMIN_AUTH_COOKIE = 'auth-token';
const ADMIN_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: NextRequest) {
  try {
    const secret = getJwtSecretOrNull();
    if (!secret) {
      return NextResponse.json(
        { success: false, error: 'Server auth secret is not configured' },
        { status: 503 }
      );
    }

    const adminUsername = (process.env.ADMIN_USERNAME || '').trim();
    const adminPasswordHash = (process.env.ADMIN_PASSWORD_HASH || '').trim();
    if (!adminUsername || !adminPasswordHash) {
      return NextResponse.json(
        { success: false, error: 'Admin credentials are not configured' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const username = body.username || body.email;
    const { password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password required' },
        { status: 400 }
      );
    }

    // Verify credentials
    if (username !== adminUsername) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, adminPasswordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { username, role: 'admin' },
      secret,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json({
      success: true,
      user: { username, role: 'admin' },
    });

    response.cookies.set({
      name: ADMIN_AUTH_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ADMIN_TOKEN_MAX_AGE_SECONDS,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
