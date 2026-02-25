import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import ContactMessage from '@/lib/models/ContactMessage';
import { generateContactTicketId } from '@/lib/contact/ticket';
import { sendContactAcknowledgementEmail } from '@/lib/notifications/contactAckEmail';
import { verifyAntiBot } from '@/lib/security/antiBot';
import { createStoredContactMessage } from '@/lib/storage/contactMessagesFile';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+()\-\s0-9]{7,20}$/;
const SOURCE_REGEX = /^[a-z0-9-]{2,40}$/;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 6;
const DUPLICATE_SUBMISSION_WINDOW_MS = 2 * 60 * 1000;
const RATE_LIMIT_RETRY_AFTER_SECONDS = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
const RATE_LIMIT_RETRY_AFTER_MINUTES = Math.ceil(RATE_LIMIT_RETRY_AFTER_SECONDS / 60);
const rateLimitBuckets = new Map<string, number[]>();
const recentSubmissionFingerprints = new Map<string, { timestamp: number; ticketId: string }>();

type ContactPayload = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  source: string;
  website: string;
  turnstileToken: string;
  recaptchaToken: string;
};

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

function parsePayload(body: Record<string, unknown>): {
  payload: ContactPayload;
  errors: string[];
} {
  const sourceInput = clean(body.source, 40).toLowerCase();

  const payload: ContactPayload = {
    name: clean(body.name, 120),
    email: clean(body.email, 180).toLowerCase(),
    phone: clean(body.phone, 20),
    subject: clean(body.subject, 200),
    message: cleanMessage(body.message),
    source: SOURCE_REGEX.test(sourceInput) ? sourceInput : 'main-contact',
    website: clean(body.website, 100),
    turnstileToken: clean(body.turnstileToken, 4000),
    recaptchaToken: clean(body.recaptchaToken, 4000),
  };

  const errors: string[] = [];

  if (payload.name.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!EMAIL_REGEX.test(payload.email)) {
    errors.push('Please provide a valid email address');
  }

  if (payload.phone && !PHONE_REGEX.test(payload.phone)) {
    errors.push('Please provide a valid phone number');
  }

  if (payload.message.length < 10) {
    errors.push('Message must be at least 10 characters long');
  }

  return { payload, errors };
}

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim().slice(0, 120) || '';
  }
  return clean(req.headers.get('x-real-ip'), 120);
}

function pruneContactGuards(now: number) {
  for (const [ip, attempts] of rateLimitBuckets.entries()) {
    const activeAttempts = attempts.filter(
      (timestamp) => now - timestamp <= RATE_LIMIT_WINDOW_MS
    );
    if (activeAttempts.length === 0) {
      rateLimitBuckets.delete(ip);
      continue;
    }
    rateLimitBuckets.set(ip, activeAttempts);
  }

  for (const [fingerprint, existing] of recentSubmissionFingerprints.entries()) {
    if (now - existing.timestamp > DUPLICATE_SUBMISSION_WINDOW_MS) {
      recentSubmissionFingerprints.delete(fingerprint);
    }
  }
}

function consumeRateLimit(ip: string, now: number): boolean {
  const attempts = rateLimitBuckets.get(ip) || [];
  const activeAttempts = attempts.filter(
    (timestamp) => now - timestamp <= RATE_LIMIT_WINDOW_MS
  );

  if (activeAttempts.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitBuckets.set(ip, activeAttempts);
    return false;
  }

  activeAttempts.push(now);
  rateLimitBuckets.set(ip, activeAttempts);
  return true;
}

function buildSubmissionFingerprint(payload: ContactPayload, ip: string) {
  const canonical = `${ip}|${payload.email}|${payload.subject}|${payload.message
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()}`;
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function getDuplicateSubmissionTicket(
  fingerprint: string,
  now: number
): { ticketId: string } | null {
  const previous = recentSubmissionFingerprints.get(fingerprint);
  if (!previous) return null;
  if (now - previous.timestamp > DUPLICATE_SUBMISSION_WINDOW_MS) {
    recentSubmissionFingerprints.delete(fingerprint);
    return null;
  }

  recentSubmissionFingerprints.set(fingerprint, {
    timestamp: now,
    ticketId: previous.ticketId,
  });
  return { ticketId: previous.ticketId };
}

function rememberSubmissionFingerprint(
  fingerprint: string,
  ticketId: string,
  now: number
) {
  recentSubmissionFingerprints.set(fingerprint, { timestamp: now, ticketId });
}

function createRequestId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto
    .createHash('sha1')
    .update(`${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .digest('hex')
    .slice(0, 20);
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

    const { payload, errors } = parsePayload(body);

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors[0] },
        { status: 400 }
      );
    }

    // Honeypot field for simple bot protection.
    if (payload.website) {
      return NextResponse.json(
        { success: true, message: 'Message received' },
        { status: 202 }
      );
    }

    const requestId = createRequestId();
    const clientIp = getClientIp(req) || 'unknown';
    const now = Date.now();

    pruneContactGuards(now);

    if (!consumeRateLimit(clientIp, now)) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many requests. Please retry in about ${RATE_LIMIT_RETRY_AFTER_MINUTES} minutes.`,
          requestId,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(RATE_LIMIT_RETRY_AFTER_SECONDS) },
        }
      );
    }

    const fingerprint = buildSubmissionFingerprint(payload, clientIp);
    const duplicate = getDuplicateSubmissionTicket(fingerprint, now);
    if (duplicate) {
      return NextResponse.json(
        {
          success: true,
          message: 'Message already received recently.',
          requestId,
          ticketId: duplicate.ticketId,
        },
        { status: 202 }
      );
    }

    const antiBotResult = await verifyAntiBot({
      turnstileToken: payload.turnstileToken,
      recaptchaToken: payload.recaptchaToken,
      remoteIp: clientIp,
    });

    if (!antiBotResult.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            antiBotResult.error ||
            'Anti-bot verification failed. Please refresh and try again.',
          requestId,
        },
        { status: 400 }
      );
    }

    const ticketId = generateContactTicketId();

    const savePayload = {
      ticketId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      subject: payload.subject,
      message: payload.message,
      source: payload.source,
      ipAddress: clientIp,
      userAgent: clean(req.headers.get('user-agent'), 500),
    };

    if (process.env.MONGODB_URI) {
      try {
        await connectDB();
        await ContactMessage.create(savePayload);
      } catch (mongoError) {
        console.error('Mongo write failed, falling back to file storage:', mongoError);
        await createStoredContactMessage(savePayload);
      }
    } else {
      await createStoredContactMessage(savePayload);
    }

    rememberSubmissionFingerprint(fingerprint, ticketId, now);

    const emailResult = await sendContactAcknowledgementEmail({
      to: payload.email,
      name: payload.name,
      ticketId,
      subject: payload.subject,
    });

    if (!emailResult.sent && !emailResult.skipped) {
      console.error('Contact acknowledgement email failed:', emailResult.error);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Message sent successfully',
        requestId,
        ticketId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Contact submission failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to send message right now. Please try again.' },
      { status: 500 }
    );
  }
}
