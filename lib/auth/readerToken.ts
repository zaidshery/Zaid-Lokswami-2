import type { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getJwtSecretOrNull, requireJwtSecret } from '@/lib/auth/jwtSecret';

export const READER_AUTH_COOKIE = 'reader-token';

export type ReaderTokenPayload = {
  userId: string;
  email: string;
  role: 'reader';
};

const READER_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function generateReaderToken(payload: ReaderTokenPayload) {
  const secret = requireJwtSecret();
  return jwt.sign(payload, secret, { expiresIn: `${READER_TOKEN_MAX_AGE_SECONDS}s` });
}

export function verifyReaderToken(token: string): ReaderTokenPayload | null {
  const secret = getJwtSecretOrNull();
  if (!secret) return null;

  try {
    return jwt.verify(token, secret) as ReaderTokenPayload;
  } catch {
    return null;
  }
}

export function getReaderTokenFromRequest(req: NextRequest) {
  return req.cookies.get(READER_AUTH_COOKIE)?.value || '';
}

export function setReaderAuthCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: READER_AUTH_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: READER_TOKEN_MAX_AGE_SECONDS,
  });
}

export function clearReaderAuthCookie(res: NextResponse) {
  res.cookies.set({
    name: READER_AUTH_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
