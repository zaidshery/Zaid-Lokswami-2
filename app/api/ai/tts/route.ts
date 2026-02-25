import { NextRequest, NextResponse } from 'next/server';
import { synthesizeBhashiniSpeech } from '@/lib/ai/bhashiniTts';
import {
  BHASHINI_LANGUAGE_OPTIONS,
  isSupportedBhashiniLanguage,
} from '@/lib/constants/lokswamiAi';

function isBhashiniConfigured() {
  return Boolean(process.env.BHASHINI_TTS_API_URL?.trim());
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      bhashiniConfigured: isBhashiniConfigured(),
      supportedLanguages: BHASHINI_LANGUAGE_OPTIONS,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      text?: string;
      languageCode?: string;
      voice?: string;
    };

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const languageCode =
      typeof body.languageCode === 'string' ? body.languageCode.trim() : 'hi-IN';
    const voice = typeof body.voice === 'string' ? body.voice.trim() : '';

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text is required for TTS.' },
        { status: 400 }
      );
    }

    if (text.length > 3500) {
      return NextResponse.json(
        { success: false, error: 'Text is too long for TTS. Keep it under 3500 characters.' },
        { status: 400 }
      );
    }

    if (!isSupportedBhashiniLanguage(languageCode)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported language code for Bhashini TTS.' },
        { status: 400 }
      );
    }

    const synthesized = await synthesizeBhashiniSpeech({
      text,
      languageCode,
      voice,
    });

    if (synthesized.mode === 'unavailable') {
      return NextResponse.json(
        { success: false, error: synthesized.reason },
        { status: 501 }
      );
    }

    return NextResponse.json({
      success: true,
      data: synthesized,
    });
  } catch (error) {
    console.error('AI tts route failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to synthesize speech.' },
      { status: 500 }
    );
  }
}
