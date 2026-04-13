import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeadershipReportSchedule } from '@/lib/storage/leadershipReportSchedulesFile';

const getLeadershipReportPresetMock = vi.fn();
const sendLeadershipReportEmailMock = vi.fn();
const sendLeadershipReportWebhookMock = vi.fn();
const createLeadershipReportRunHistoryMock = vi.fn();
const listLeadershipReportSchedulesMock = vi.fn();
const recordLeadershipReportRunMock = vi.fn();
const maybeNotifyLeadershipReportCriticalAlertsMock = vi.fn();

vi.mock('@/lib/admin/leadershipReports', () => ({
  getLeadershipReportPreset: getLeadershipReportPresetMock,
}));

vi.mock('@/lib/notifications/leadershipReportEmail', () => ({
  sendLeadershipReportEmail: sendLeadershipReportEmailMock,
}));

vi.mock('@/lib/notifications/leadershipReportWebhook', () => ({
  sendLeadershipReportWebhook: sendLeadershipReportWebhookMock,
}));

vi.mock('@/lib/admin/leadershipReportCriticalAlertNotifier', () => ({
  maybeNotifyLeadershipReportCriticalAlerts: maybeNotifyLeadershipReportCriticalAlertsMock,
}));

vi.mock('@/lib/storage/leadershipReportRunHistoryFile', () => ({
  createLeadershipReportRunHistory: createLeadershipReportRunHistoryMock,
}));

vi.mock('@/lib/storage/leadershipReportSchedulesFile', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage/leadershipReportSchedulesFile')>(
    '@/lib/storage/leadershipReportSchedulesFile'
  );

  return {
    ...actual,
    listLeadershipReportSchedules: listLeadershipReportSchedulesMock,
    recordLeadershipReportRun: recordLeadershipReportRunMock,
  };
});

function createSchedule(
  overrides: Partial<LeadershipReportSchedule> = {}
): LeadershipReportSchedule {
  return {
    id: 'daily_briefing' as const,
    label: 'Daily Briefing',
    description: 'Daily leadership briefing.',
    cadenceLabel: 'Daily',
    enabled: true,
    deliveryTime: '08:30',
    timezone: 'Asia/Calcutta',
    deliveryMode: 'dashboard_link' as const,
    recipientEmails: [] as string[],
    webhookUrls: [] as string[],
    webhookProvider: 'generic_json' as const,
    notes: '',
    lastRunAt: null,
    lastRunStatus: 'idle' as const,
    lastRunSummary: '',
    updatedAt: '2026-04-01T00:00:00.000Z',
    nextPlannedAt: '2026-04-07T03:00:00.000Z',
    viewHref: '/admin/analytics',
    downloadHref: '/api/admin/analytics/briefing?preset=daily_briefing',
    ...overrides,
  };
}

describe('runLeadershipReportSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeNotifyLeadershipReportCriticalAlertsMock.mockResolvedValue({
      sent: false,
      skipped: true,
      alertCount: 0,
      reason: 'No critical delivery alerts are active.',
      emailRecipients: [],
      webhookTargets: 0,
    });
  });

  it('records a successful non-email run', async () => {
    listLeadershipReportSchedulesMock.mockResolvedValue([createSchedule()]);
    getLeadershipReportPresetMock.mockResolvedValue({
      id: 'daily_briefing',
      headline: 'Daily leadership summary is ready.',
    });
    recordLeadershipReportRunMock.mockResolvedValue(
      createSchedule({
        lastRunAt: '2026-04-06T06:00:00.000Z',
        lastRunStatus: 'success',
        lastRunSummary: 'Daily leadership summary is ready.',
      })
    );
    createLeadershipReportRunHistoryMock.mockResolvedValue({
      id: 'history-1',
      status: 'success',
      summary: 'Daily leadership summary is ready.',
    });

    const { runLeadershipReportSchedule } = await import('@/lib/admin/leadershipReportRunner');
    const result = await runLeadershipReportSchedule('daily_briefing', {
      trigger: 'manual',
      actorEmail: 'boss@lokswami.com',
    });

    expect(result.ok).toBe(true);
    expect(sendLeadershipReportEmailMock).not.toHaveBeenCalled();
    expect(sendLeadershipReportWebhookMock).not.toHaveBeenCalled();
    expect(recordLeadershipReportRunMock).toHaveBeenCalledWith({
      id: 'daily_briefing',
      status: 'success',
      summary: 'Daily leadership summary is ready.',
    });
    expect(createLeadershipReportRunHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 'daily_briefing',
        trigger: 'manual',
        actorEmail: 'boss@lokswami.com',
        status: 'success',
      })
    );
  });

  it('records a failed run when email delivery fails', async () => {
    listLeadershipReportSchedulesMock.mockResolvedValue([
      createSchedule({
        deliveryMode: 'email_summary',
        recipientEmails: ['leader@lokswami.com'],
      }),
    ]);
    getLeadershipReportPresetMock.mockResolvedValue({
      id: 'daily_briefing',
      headline: 'Daily leadership summary is ready.',
    });
    sendLeadershipReportEmailMock.mockResolvedValue({
      sent: false,
      error: 'Resend API key missing.',
    });
    recordLeadershipReportRunMock.mockResolvedValue(
      createSchedule({
        deliveryMode: 'email_summary',
        recipientEmails: ['leader@lokswami.com'],
        lastRunAt: '2026-04-06T06:00:00.000Z',
        lastRunStatus: 'failed',
        lastRunSummary: 'Resend API key missing.',
      })
    );
    createLeadershipReportRunHistoryMock.mockResolvedValue({
      id: 'history-2',
      status: 'failed',
      summary: 'Resend API key missing.',
    });

    const { runLeadershipReportSchedule } = await import('@/lib/admin/leadershipReportRunner');
    const result = await runLeadershipReportSchedule('daily_briefing', {
      trigger: 'cron',
    });

    expect(result.ok).toBe(false);
    expect(sendLeadershipReportEmailMock).toHaveBeenCalledWith({
      to: ['leader@lokswami.com'],
      report: expect.objectContaining({ id: 'daily_briefing' }),
    });
    expect(recordLeadershipReportRunMock).toHaveBeenCalledWith({
      id: 'daily_briefing',
      status: 'failed',
      summary: 'Resend API key missing.',
    });
    expect(createLeadershipReportRunHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: 'cron',
        actorEmail: null,
        status: 'failed',
      })
    );
    expect(result.error).toBe('Resend API key missing.');
  });

  it('records a successful webhook run', async () => {
    listLeadershipReportSchedulesMock.mockResolvedValue([
      createSchedule({
        deliveryMode: 'webhook_summary',
        webhookUrls: ['https://example.com/lokswami-hook'],
        webhookProvider: 'slack',
      }),
    ]);
    getLeadershipReportPresetMock.mockResolvedValue({
      id: 'daily_briefing',
      headline: 'Daily leadership summary is ready.',
    });
    sendLeadershipReportWebhookMock.mockResolvedValue({
      sent: true,
      deliveredTo: ['https://example.com/lokswami-hook'],
    });
    recordLeadershipReportRunMock.mockResolvedValue(
      createSchedule({
        deliveryMode: 'webhook_summary',
        webhookUrls: ['https://example.com/lokswami-hook'],
        webhookProvider: 'slack',
        lastRunAt: '2026-04-06T06:00:00.000Z',
        lastRunStatus: 'success',
        lastRunSummary: 'Delivered via Slack to 1 webhook target(s).',
      })
    );
    createLeadershipReportRunHistoryMock.mockResolvedValue({
      id: 'history-3',
      status: 'success',
      summary: 'Delivered via Slack to 1 webhook target(s).',
    });

    const { runLeadershipReportSchedule } = await import('@/lib/admin/leadershipReportRunner');
    const result = await runLeadershipReportSchedule('daily_briefing', {
      trigger: 'manual',
      actorEmail: 'boss@lokswami.com',
    });

    expect(result.ok).toBe(true);
    expect(sendLeadershipReportWebhookMock).toHaveBeenCalledWith({
      urls: ['https://example.com/lokswami-hook'],
      provider: 'slack',
      report: expect.objectContaining({ id: 'daily_briefing' }),
    });
    expect(recordLeadershipReportRunMock).toHaveBeenCalledWith({
      id: 'daily_briefing',
      status: 'success',
      summary: 'Delivered via Slack to 1 webhook target(s).',
    });
  });

  it('retries only schedules whose last run failed', async () => {
    listLeadershipReportSchedulesMock.mockResolvedValue([
      createSchedule({
        id: 'daily_briefing',
        label: 'Daily Briefing',
        lastRunStatus: 'failed',
      }),
      createSchedule({
        id: 'weekly_briefing',
        label: 'Weekly Briefing',
        cadenceLabel: 'Weekly',
        lastRunStatus: 'success',
        downloadHref: '/api/admin/analytics/briefing?preset=weekly_briefing',
      }),
    ]);
    getLeadershipReportPresetMock.mockResolvedValue({
      id: 'daily_briefing',
      headline: 'Recovered daily leadership summary.',
    });
    recordLeadershipReportRunMock.mockResolvedValue(
      createSchedule({
        id: 'daily_briefing',
        label: 'Daily Briefing',
        lastRunAt: '2026-04-06T06:00:00.000Z',
        lastRunStatus: 'success',
        lastRunSummary: 'Recovered daily leadership summary.',
      })
    );
    createLeadershipReportRunHistoryMock.mockResolvedValue({
      id: 'history-4',
      status: 'success',
      summary: 'Recovered daily leadership summary.',
    });

    const { runFailedLeadershipReportSchedules } = await import(
      '@/lib/admin/leadershipReportRunner'
    );
    const result = await runFailedLeadershipReportSchedules({
      actorEmail: 'boss@lokswami.com',
    });

    expect(result.failedCount).toBe(1);
    expect(result.retryCount).toBe(1);
    expect(getLeadershipReportPresetMock).toHaveBeenCalledTimes(1);
    expect(getLeadershipReportPresetMock).toHaveBeenCalledWith('daily_briefing');
    expect(createLeadershipReportRunHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 'daily_briefing',
        actorEmail: 'boss@lokswami.com',
        status: 'success',
      })
    );
  });

  it('notifies critical alert targets after due schedules run', async () => {
    listLeadershipReportSchedulesMock.mockResolvedValue([
      createSchedule({
        id: 'daily_briefing',
        nextPlannedAt: '2026-04-06T03:00:00.000Z',
      }),
    ]);
    getLeadershipReportPresetMock.mockResolvedValue({
      id: 'daily_briefing',
      headline: 'Daily leadership summary is ready.',
    });
    recordLeadershipReportRunMock.mockResolvedValue(
      createSchedule({
        id: 'daily_briefing',
        lastRunAt: '2026-04-06T06:00:00.000Z',
        lastRunStatus: 'success',
        lastRunSummary: 'Daily leadership summary is ready.',
      })
    );
    createLeadershipReportRunHistoryMock.mockResolvedValue({
      id: 'history-5',
      status: 'success',
      summary: 'Daily leadership summary is ready.',
    });
    maybeNotifyLeadershipReportCriticalAlertsMock.mockResolvedValue({
      sent: true,
      skipped: false,
      alertCount: 1,
      reason: 'Notified leadership about 1 critical delivery alert(s).',
      emailRecipients: ['boss@lokswami.com'],
      webhookTargets: 0,
    });

    const { runDueLeadershipReportSchedules } = await import(
      '@/lib/admin/leadershipReportRunner'
    );
    const result = await runDueLeadershipReportSchedules(
      new Date('2026-04-06T06:00:00.000Z')
    );

    expect(result.dueCount).toBe(1);
    expect(result.criticalAlertNotification).toMatchObject({
      sent: true,
      alertCount: 1,
    });
    expect(maybeNotifyLeadershipReportCriticalAlertsMock).toHaveBeenCalledTimes(1);
  });
});
