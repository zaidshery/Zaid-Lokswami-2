import { describe, expect, it } from 'vitest';
import { getLeadershipReportDeliveryMetrics } from '@/lib/admin/leadershipReportDeliveryMetrics';
import type { LeadershipReportRunHistoryEntry } from '@/lib/storage/leadershipReportRunHistoryFile';
import type { LeadershipReportSchedule } from '@/lib/storage/leadershipReportSchedulesFile';

function createSchedule(
  overrides: Partial<LeadershipReportSchedule> = {}
): LeadershipReportSchedule {
  return {
    id: 'daily_briefing',
    label: 'Daily Briefing',
    description: 'Daily summary.',
    cadenceLabel: 'Daily',
    enabled: true,
    deliveryTime: '08:30',
    timezone: 'Asia/Calcutta',
    deliveryMode: 'dashboard_link',
    recipientEmails: [],
    webhookUrls: [],
    webhookProvider: 'generic_json',
    notes: '',
    lastRunAt: null,
    lastRunStatus: 'idle',
    lastRunSummary: '',
    updatedAt: '2026-04-01T00:00:00.000Z',
    nextPlannedAt: '2026-04-07T03:00:00.000Z',
    viewHref: '/admin/analytics',
    downloadHref: '/api/admin/analytics/briefing?preset=daily_briefing',
    ...overrides,
  };
}

function createHistory(
  overrides: Partial<LeadershipReportRunHistoryEntry> = {}
): LeadershipReportRunHistoryEntry {
  return {
    id: 'run-1',
    scheduleId: 'daily_briefing',
    label: 'Daily Briefing',
    cadenceLabel: 'Daily',
    deliveryMode: 'dashboard_link',
    webhookProvider: null,
    recipientEmails: [],
    trigger: 'manual',
    actorEmail: 'boss@lokswami.com',
    status: 'success',
    summary: 'Run complete.',
    createdAt: '2026-04-06T06:00:00.000Z',
    ...overrides,
  };
}

describe('getLeadershipReportDeliveryMetrics', () => {
  it('aggregates recent run stats and success rate', () => {
    const metrics = getLeadershipReportDeliveryMetrics({
      schedules: [createSchedule()],
      history: [
        createHistory({ id: 'run-1', status: 'success', trigger: 'manual' }),
        createHistory({ id: 'run-2', status: 'failed', trigger: 'cron' }),
      ],
    });

    expect(metrics.recentRuns).toBe(2);
    expect(metrics.successRuns).toBe(1);
    expect(metrics.failedRuns).toBe(1);
    expect(metrics.manualRuns).toBe(1);
    expect(metrics.cronRuns).toBe(1);
    expect(metrics.successRate).toBe(50);
  });

  it('breaks down webhook runs by provider', () => {
    const metrics = getLeadershipReportDeliveryMetrics({
      schedules: [
        createSchedule({
          id: 'weekly_briefing',
          label: 'Weekly Briefing',
          cadenceLabel: 'Weekly',
          deliveryMode: 'webhook_summary',
          webhookProvider: 'slack',
          webhookUrls: ['https://hooks.slack.com/services/a/b/c'],
          downloadHref: '/api/admin/analytics/briefing?preset=weekly_briefing',
        }),
      ],
      history: [
        createHistory({
          id: 'run-3',
          scheduleId: 'weekly_briefing',
          label: 'Weekly Briefing',
          cadenceLabel: 'Weekly',
          deliveryMode: 'webhook_summary',
          webhookProvider: 'slack',
          status: 'success',
        }),
      ],
    });

    const slack = metrics.providerBreakdown.find((item) => item.key === 'slack');
    expect(slack).toMatchObject({
      enabledSchedules: 1,
      recentRuns: 1,
      successRuns: 1,
      failedRuns: 0,
    });
  });
});
