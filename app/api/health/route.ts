import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        status: 'error',
        message,
      },
      { status: 500 }
    );
  }
}
