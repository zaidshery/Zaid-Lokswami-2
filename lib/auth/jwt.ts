import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getJwtSecretOrNull, requireJwtSecret } from '@/lib/auth/jwtSecret';

const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (
  password: string, 
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload: JWTPayload): string => {
  const secret = requireJwtSecret();
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JWTPayload | null => {
  const secret = getJwtSecretOrNull();
  if (!secret) return null;

  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch {
    return null;
  }
};
