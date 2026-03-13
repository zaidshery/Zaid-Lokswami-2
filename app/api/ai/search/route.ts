import { NextRequest, NextResponse } from 'next/server';
import { searchLokswamiNews, type SearchRequestBody } from '@/lib/ai/lokswamiSearchAssistant';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as SearchRequestBody;
    const query = typeof body.query === 'string' ? body.query.trim() : '';

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    const payload = await searchLokswamiNews(body);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI search failed';
    console.error('[AI Search Route] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
