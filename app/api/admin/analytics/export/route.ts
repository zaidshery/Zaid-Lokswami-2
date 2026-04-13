import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsCenterData } from '@/lib/admin/analyticsCenter';
import {
  buildAnalyticsCsvExport,
  type AnalyticsExportContentFilter,
  type AnalyticsExportFocus,
  type AnalyticsExportTab,
} from '@/lib/admin/analyticsExport';
import { getAdminSession } from '@/lib/auth/admin';
import { canViewPage } from '@/lib/auth/permissions';

function parseTab(value: string | null): AnalyticsExportTab {
  return ['overview', 'audience', 'newsroom_ops', 'epaper_ops', 'team', 'content', 'growth', 'system_health'].includes(
    String(value || '')
  )
    ? (value as AnalyticsExportTab)
    : 'overview';
}

function parseFocus(value: string | null): AnalyticsExportFocus {
  return ['all', 'review', 'ready', 'blocked', 'quality'].includes(String(value || ''))
    ? (value as AnalyticsExportFocus)
    : 'all';
}

function parseContent(value: string | null): AnalyticsExportContentFilter {
  return ['all', 'article', 'story', 'video', 'epaper'].includes(String(value || ''))
    ? (value as AnalyticsExportContentFilter)
    : 'all';
}

function parseRange(value: string | null) {
  return ['today', '7d', '30d', '90d'].includes(String(value || ''))
    ? (value as 'today' | '7d' | '30d' | '90d')
    : '30d';
}

function parseCompare(value: string | null) {
  return value === 'previous' ? 'previous' : 'off';
}

export async function GET(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!canViewPage(admin.role, 'analytics')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tab = parseTab(searchParams.get('tab'));
  const focus = parseFocus(searchParams.get('focus'));
  const content = parseContent(searchParams.get('content'));
  const range = parseRange(searchParams.get('range'));
  const compare = parseCompare(searchParams.get('compare'));

  const analytics = await getAnalyticsCenterData({ range, compare });
  const payload = buildAnalyticsCsvExport({
    analytics,
    tab,
    focus,
    content,
    range,
    compare,
  });

  return new NextResponse(`\uFEFF${payload.csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${payload.fileName}"`,
      'Cache-Control': 'no-store',
      'X-Lokswami-Export-Count': String(payload.rowCount),
    },
  });
}
