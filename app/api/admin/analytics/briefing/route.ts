import { NextRequest, NextResponse } from 'next/server';
import {
  buildLeadershipReportMarkdown,
  getLeadershipReportPreset,
  type LeadershipReportPresetId,
} from '@/lib/admin/leadershipReports';
import { getAdminSession } from '@/lib/auth/admin';
import { canViewPage } from '@/lib/auth/permissions';

function parsePreset(value: string | null): LeadershipReportPresetId {
  return ['daily_briefing', 'weekly_briefing', 'monthly_briefing', 'growth_briefing'].includes(String(value || ''))
    ? (value as LeadershipReportPresetId)
    : 'weekly_briefing';
}

function parseFormat(value: string | null) {
  return value === 'json' ? 'json' : 'markdown';
}

function buildFileName(preset: LeadershipReportPresetId) {
  const dateToken = new Date().toISOString().slice(0, 10);
  const fileBase =
    preset === 'daily_briefing'
      ? 'daily'
      : preset === 'growth_briefing'
        ? 'growth'
      : preset === 'monthly_briefing'
        ? 'monthly'
        : 'weekly';

  return `lokswami-${fileBase}-leadership-briefing-${dateToken}.md`;
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
  const preset = parsePreset(searchParams.get('preset'));
  const format = parseFormat(searchParams.get('format'));
  const report = await getLeadershipReportPreset(preset);

  if (format === 'json') {
    return NextResponse.json({
      success: true,
      report,
    });
  }

  const markdown = buildLeadershipReportMarkdown(report);

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${buildFileName(preset)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
