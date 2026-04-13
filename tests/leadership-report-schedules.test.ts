import { describe, expect, it } from 'vitest';
import {
  isLeadershipReportScheduleDue,
  type LeadershipReportSchedule,
} from '@/lib/storage/leadershipReportSchedulesFile';

function createSchedule(
  overrides: Partial<LeadershipReportSchedule> = {}
): LeadershipReportSchedule {
  return {
    id: 'daily_briefing',
    label: 'Daily Briefing',
    description: 'Daily leadership summary.',
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
    updatedAt: new Date('2026-04-01T00:00:00.000Z').toISOString(),
    nextPlannedAt: new Date('2026-04-07T03:00:00.000Z').toISOString(),
    viewHref: '/admin/analytics',
    downloadHref: '/api/admin/analytics/briefing?preset=daily_briefing',
    ...overrides,
  };
}

describe('isLeadershipReportScheduleDue', () => {
  it('returns true for a daily briefing after delivery time when it has not run today', () => {
    const schedule = createSchedule();
    const now = new Date('2026-04-06T04:00:00.000Z');

    expect(isLeadershipReportScheduleDue(schedule, now)).toBe(true);
  });

  it('returns false for a daily briefing before delivery time', () => {
    const schedule = createSchedule();
    const now = new Date('2026-04-06T02:00:00.000Z');

    expect(isLeadershipReportScheduleDue(schedule, now)).toBe(false);
  });

  it('returns false when a daily briefing already ran on the same zoned day', () => {
    const schedule = createSchedule({
      lastRunAt: '2026-04-06T05:00:00.000Z',
    });
    const now = new Date('2026-04-06T07:00:00.000Z');

    expect(isLeadershipReportScheduleDue(schedule, now)).toBe(false);
  });

  it('returns true for a weekly briefing only on Monday after delivery time', () => {
    const schedule = createSchedule({
      id: 'weekly_briefing',
      label: 'Weekly Briefing',
      cadenceLabel: 'Weekly',
      downloadHref: '/api/admin/analytics/briefing?preset=weekly_briefing',
    });

    expect(isLeadershipReportScheduleDue(schedule, new Date('2026-04-06T04:00:00.000Z'))).toBe(
      true
    );
    expect(isLeadershipReportScheduleDue(schedule, new Date('2026-04-07T04:00:00.000Z'))).toBe(
      false
    );
  });

  it('treats growth briefing like a weekly Monday schedule', () => {
    const schedule = createSchedule({
      id: 'growth_briefing',
      label: 'Growth Briefing',
      cadenceLabel: 'Weekly Growth',
      deliveryTime: '09:15',
      downloadHref: '/api/admin/analytics/briefing?preset=growth_briefing',
    });

    expect(isLeadershipReportScheduleDue(schedule, new Date('2026-04-06T04:00:00.000Z'))).toBe(
      true
    );
    expect(isLeadershipReportScheduleDue(schedule, new Date('2026-04-08T04:00:00.000Z'))).toBe(
      false
    );
  });

  it('returns true for a monthly briefing only on the first day of the month after delivery time', () => {
    const schedule = createSchedule({
      id: 'monthly_briefing',
      label: 'Monthly Briefing',
      cadenceLabel: 'Monthly',
      enabled: true,
      deliveryTime: '10:00',
      downloadHref: '/api/admin/analytics/briefing?preset=monthly_briefing',
    });

    expect(isLeadershipReportScheduleDue(schedule, new Date('2026-05-01T05:00:00.000Z'))).toBe(
      true
    );
    expect(isLeadershipReportScheduleDue(schedule, new Date('2026-05-02T05:00:00.000Z'))).toBe(
      false
    );
  });

  it('returns false for disabled schedules', () => {
    const schedule = createSchedule({ enabled: false });
    const now = new Date('2026-04-06T04:00:00.000Z');

    expect(isLeadershipReportScheduleDue(schedule, now)).toBe(false);
  });
});
