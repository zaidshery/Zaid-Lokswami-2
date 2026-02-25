import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import AdvertiseInquiry from '@/lib/models/AdvertiseInquiry';
import { createStoredAdvertiseInquiry } from '@/lib/storage/advertiseInquiriesFile';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+()\-\s0-9]{7,20}$/;
const SOURCE_REGEX = /^[a-z0-9-]{2,40}$/;
const CAMPAIGN_TYPES = new Set(['display', 'sponsored', 'video', 'mixed']);

function clean(value: unknown, max: number) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

function cleanMessage(value: unknown) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, 5000);
}

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim().slice(0, 120) || '';
  }
  return clean(req.headers.get('x-real-ip'), 120);
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload' },
        { status: 400 }
      );
    }

    const sourceInput = clean(body.source, 40).toLowerCase();
    const campaignTypeInput = clean(body.campaignType, 40).toLowerCase();

    const payload = {
      name: clean(body.name, 120),
      company: clean(body.company, 160),
      email: clean(body.email, 180).toLowerCase(),
      phone: clean(body.phone, 20),
      budget: clean(body.budget, 80),
      campaignType: CAMPAIGN_TYPES.has(campaignTypeInput) ? campaignTypeInput : 'display',
      targetLocations: clean(body.targetLocations, 300),
      message: cleanMessage(body.message),
      source: SOURCE_REGEX.test(sourceInput) ? sourceInput : 'main-advertise',
      website: clean(body.website, 100),
    };

    if (payload.name.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (payload.company.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Company name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(payload.email)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    if (payload.phone && !PHONE_REGEX.test(payload.phone)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid phone number' },
        { status: 400 }
      );
    }

    if (payload.message.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Message must be at least 10 characters long' },
        { status: 400 }
      );
    }

    // Honeypot field for simple bot protection.
    if (payload.website) {
      return NextResponse.json(
        { success: true, message: 'Inquiry received' },
        { status: 202 }
      );
    }

    const savePayload = {
      name: payload.name,
      company: payload.company,
      email: payload.email,
      phone: payload.phone,
      budget: payload.budget,
      campaignType: payload.campaignType,
      targetLocations: payload.targetLocations,
      message: payload.message,
      source: payload.source,
      ipAddress: getClientIp(req),
      userAgent: clean(req.headers.get('user-agent'), 500),
    };

    if (process.env.MONGODB_URI) {
      try {
        await connectDB();
        await AdvertiseInquiry.create(savePayload);

        return NextResponse.json(
          { success: true, message: 'Inquiry submitted successfully' },
          { status: 201 }
        );
      } catch (mongoError) {
        console.error('Mongo write failed, falling back to file storage:', mongoError);
      }
    }

    await createStoredAdvertiseInquiry(savePayload);

    return NextResponse.json(
      { success: true, message: 'Inquiry submitted successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Advertise inquiry failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to submit inquiry right now. Please try again.' },
      { status: 500 }
    );
  }
}
