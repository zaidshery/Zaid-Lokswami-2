import { NextResponse } from 'next/server';
import { clearReaderAuthCookie } from '@/lib/auth/readerToken';

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearReaderAuthCookie(response);
  return response;
}

