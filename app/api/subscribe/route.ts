import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import Subscriber from '@/lib/models/Subscriber';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_SOURCES = new Set(['main', 'epaper']);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const source = String(body?.source || 'main').trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (!ALLOWED_SOURCES.has(source)) {
      return NextResponse.json(
        { success: false, error: 'Invalid source' },
        { status: 400 }
      );
    }

    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { success: false, error: 'Subscription service is not configured yet' },
        { status: 503 }
      );
    }

    await connectDB();

    const existing = await Subscriber.findOne({ email });
    if (existing) {
      if (!existing.sources.includes(source)) {
        existing.sources.push(source);
        await existing.save();
      }

      return NextResponse.json({
        success: true,
        message: 'You are already subscribed with this email',
      });
    }

    await Subscriber.create({
      email,
      sources: [source],
      subscribedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, message: 'Subscription successful' },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    );
  }
}
