import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import MarketingLead from '@/lib/models/MarketingLead';
import Subscriber from '@/lib/models/Subscriber';
import { upsertStoredMarketingLead } from '@/lib/storage/marketingLeadsFile';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCE_REGEX = /^[a-z0-9_\-]{2,80}$/;

function clean(value: unknown, max: number) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

function normalizeInterests(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => clean(entry, 50).toLowerCase())
    .filter(Boolean)
    .slice(0, 10);
}

async function syncSubscriber(email: string) {
  if (!process.env.MONGODB_URI) return;

  const subscriber = await Subscriber.findOne({ email });
  if (!subscriber) {
    await Subscriber.create({
      email,
      sources: ['main'],
      subscribedAt: new Date(),
    });
    return;
  }

  if (!subscriber.sources.includes('main')) {
    subscriber.sources.push('main');
    await subscriber.save();
  }
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

    const email = clean(body.email, 180).toLowerCase();
    const name = clean(body.name, 120);
    const sourceInput = clean(body.source, 80).toLowerCase();
    const campaignInput = clean(body.campaign, 80).toLowerCase();
    const interests = normalizeInterests(body.interests);
    const consent = Boolean(body.consent);
    const wantsDailyAlerts = Boolean(body.wantsDailyAlerts);

    if (!consent) {
      return NextResponse.json(
        { success: false, error: 'Consent is required' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    const source = SOURCE_REGEX.test(sourceInput) ? sourceInput : 'engagement-popup';
    const campaign = SOURCE_REGEX.test(campaignInput)
      ? campaignInput
      : 'daily-alerts';

    const savePayload = {
      email,
      name,
      interests,
      source,
      campaign,
      wantsDailyAlerts,
      consent,
    };

    if (process.env.MONGODB_URI) {
      try {
        await connectDB();
        await MarketingLead.findOneAndUpdate(
          { email, source },
          savePayload,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        if (wantsDailyAlerts) {
          await syncSubscriber(email);
        }

        return NextResponse.json({
          success: true,
          message: 'Preference saved successfully',
        });
      } catch (mongoError) {
        console.error('Mongo unavailable for marketing leads, using file store:', mongoError);
      }
    }

    await upsertStoredMarketingLead(savePayload);

    return NextResponse.json({
      success: true,
      message: 'Preference saved successfully',
    });
  } catch (error) {
    console.error('Marketing lead submission failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to save preference right now' },
      { status: 500 }
    );
  }
}
