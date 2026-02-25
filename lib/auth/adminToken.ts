import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getJwtSecretOrNull } from '@/lib/auth/jwtSecret';

const ADMIN_AUTH_COOKIE = 'auth-token';

export type AdminTokenPayload = {
  [key: string]: unknown;
  username?: string;
  role?: string;
  email?: string;
};

function readToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return req.cookies.get(ADMIN_AUTH_COOKIE)?.value || '';
}

export function verifyAdminToken(req: NextRequest): AdminTokenPayload | null {
  const token = readToken(req);
  if (!token) {
    return null;
  }

  const secret = getJwtSecretOrNull();
  if (!secret) {
    return null;
  }

  try {
    const payload = jwt.verify(token, secret) as AdminTokenPayload;
    return payload.role === 'admin' ? payload : null;
  } catch {
    return null;
  }
}
