import { NextRequest, NextResponse } from 'next/server';
import { runSemanticRagSearch } from '@/lib/ai/semanticSearch';

function parseLimit(value: unknown) {
  if (typeof value !== 'number') return 18;
  if (!Number.isFinite(value)) return 18;
  return Math.max(1, Math.min(Math.round(value), 36));
}

function parseSort(value: unknown) {
  if (value === 'latest' || value === 'popular') return value;
  return 'relevance';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      query?: string;
      category?: string;
      limit?: number;
      sortBy?: 'relevance' | 'latest' | 'popular';
    };

    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required.' },
        { status: 400 }
      );
    }

    if (query.length > 280) {
      return NextResponse.json(
        { success: false, error: 'Query is too long. Keep it under 280 characters.' },
        { status: 400 }
      );
    }

    const result = await runSemanticRagSearch({
      query,
      category: typeof body.category === 'string' ? body.category : undefined,
      limit: parseLimit(body.limit),
      sortBy: parseSort(body.sortBy),
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('AI search route failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run AI search.' },
      { status: 500 }
    );
  }
}
