import { NextRequest, NextResponse } from 'next/server';
import { runDueLeadershipReportSchedules } from '@/lib/admin/leadershipReportRunner';
import { getAdminSession } from '@/lib/auth/admin';
import { canManageLeadershipReports } from '@/lib/auth/permissions';

function hasValidCronSecret(req: NextRequest) {
  const configured = String(process.env.LEADERSHIP_REPORT_CRON_SECRET || '').trim();
  if (!configured) return false;

  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const directHeader = String(req.headers.get('x-lokswami-cron-secret') || '').trim();
  const url = new URL(req.url);
  const querySecret = String(url.searchParams.get('secret') || '').trim();

  return bearer === configured || directHeader === configured || querySecret === configured;
}

async function isAuthorized(req: NextRequest) {
  if (hasValidCronSecret(req)) {
    return true;
  }

  const admin = await getAdminSession();
  return Boolean(admin && canManageLeadershipReports(admin.role));
}

async function handleRunDue(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await runDueLeadershipReportSchedules();

    return NextResponse.json({
      success: true,
      data: {
        dueCount: payload.dueCount,
        runCount: payload.runCount,
        criticalAlertNotification: payload.criticalAlertNotification,
        results: payload.results.map((result) => ({
          ok: result.ok,
          scheduleId: result.schedule?.id || null,
          summary: result.summary,
          historyId: result.historyEntry?.id || null,
          error: result.error || null,
        })),
      },
    });
  } catch (error) {
    console.error('Leadership report cron run failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run due leadership reports.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleRunDue(req);
}

export async function POST(req: NextRequest) {
  return handleRunDue(req);
}
