import { describe, expect, it } from 'vitest';
import { getLeadershipReportDeliveryTrends } from '@/lib/admin/leadershipReportDeliveryTrends';
import type { LeadershipReportRunHistoryEntry } from '@/lib/storage/leadershipReportRunHistoryFile';

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

describe('getLeadershipReportDeliveryTrends', () => {
  it('compares the latest window against the previous window', () => {
    const trends = getLeadershipReportDeliveryTrends(
      [
        createHistory({ id: 'current-1', createdAt: '2026-04-06T06:00:00.000Z', trigger: 'cron' }),
        createHistory({ id: 'current-2', createdAt: '2026-04-04T06:00:00.000Z', status: 'failed' }),
        createHistory({ id: 'current-3', createdAt: '2026-04-01T06:00:00.000Z' }),
        createHistory({ id: 'previous-1', createdAt: '2026-03-29T06:00:00.000Z' }),
      ],
      7,
      new Date('2026-04-06T12:00:00.000Z')
    );

    expect(trends.currentRuns).toBe(3);
    expect(trends.previousRuns).toBe(1);
    expect(trends.deltaRuns).toBe(2);
    expect(trends.currentFailures).toBe(1);
    expect(trends.previousFailures).toBe(0);
    expect(trends.deltaFailures).toBe(1);
    expect(trends.currentCronRuns).toBe(1);
    expect(trends.previousCronRuns).toBe(0);
    expect(trends.deltaCronRuns).toBe(1);
    expect(trends.currentSuccessRate).toBe(67);
    expect(trends.previousSuccessRate).toBe(100);
    expect(trends.deltaSuccessRate).toBe(-33);
    expect(trends.dailyBuckets).toHaveLength(7);
  });

  it('groups webhook runs by provider in provider trends', () => {
    const trends = getLeadershipReportDeliveryTrends(
      [
        createHistory({
          id: 'slack-current',
          scheduleId: 'weekly_briefing',
          label: 'Weekly Briefing',
          cadenceLabel: 'Weekly',
          deliveryMode: 'webhook_summary',
          webhookProvider: 'slack',
          createdAt: '2026-04-05T06:00:00.000Z',
        }),
        createHistory({
          id: 'slack-previous',
          scheduleId: 'weekly_briefing',
          label: 'Weekly Briefing',
          cadenceLabel: 'Weekly',
          deliveryMode: 'webhook_summary',
          webhookProvider: 'slack',
          status: 'failed',
          createdAt: '2026-03-27T06:00:00.000Z',
        }),
      ],
      7,
      new Date('2026-04-06T12:00:00.000Z')
    );

    const slackTrend = trends.providerTrends.find((trend) => trend.key === 'slack');
    expect(slackTrend).toMatchObject({
      label: 'Slack',
      currentRuns: 1,
      previousRuns: 1,
      deltaRuns: 0,
      currentFailures: 0,
      previousFailures: 1,
    });
  });
});
