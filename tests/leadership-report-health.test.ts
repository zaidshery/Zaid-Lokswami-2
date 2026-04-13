import { describe, expect, it } from 'vitest';
import {
  buildLeadershipReportEscalations,
  buildLeadershipReportHealthAlerts,
  type LeadershipReportRuntimeSnapshot,
} from '@/lib/admin/leadershipReportHealth';
import type { LeadershipReportRunHistoryEntry } from '@/lib/storage/leadershipReportRunHistoryFile';
import type { LeadershipReportSchedule } from '@/lib/storage/leadershipReportSchedulesFile';

function createSchedule(overrides: Partial<LeadershipReportSchedule> = {}): LeadershipReportSchedule {
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
    recipientEmails: [],
    trigger: 'manual',
    actorEmail: 'boss@lokswami.com',
    status: 'failed',
    summary: 'Run failed.',
    createdAt: '2026-04-06T06:00:00.000Z',
    ...overrides,
  };
}

function createRuntime(
  overrides: Partial<LeadershipReportRuntimeSnapshot> = {}
): LeadershipReportRuntimeSnapshot {
  return {
    cronSecretConfigured: true,
    emailDeliveryConfigured: true,
    resendConfigured: true,
    fromEmailConfigured: true,
    dueNowCount: 0,
    dueNowIds: [],
    ...overrides,
  };
}

describe('buildLeadershipReportHealthAlerts', () => {
  it('flags missing email delivery for enabled email schedules as critical', () => {
    const alerts = buildLeadershipReportHealthAlerts({
      schedules: [
        createSchedule({
          deliveryMode: 'email_summary',
          recipientEmails: ['leader@lokswami.com'],
        }),
      ],
      history: [],
      runtime: createRuntime({ emailDeliveryConfigured: false }),
    });

    expect(alerts[0]).toMatchObject({
      id: 'email-delivery-missing',
      severity: 'critical',
    });
  });

  it('includes failed schedules and due runs in alert output', () => {
    const alerts = buildLeadershipReportHealthAlerts({
      schedules: [
        createSchedule({
          lastRunStatus: 'failed',
        }),
      ],
      history: [createHistory()],
      runtime: createRuntime({
        dueNowCount: 1,
        dueNowIds: ['daily_briefing'],
      }),
    });

    expect(alerts.map((alert) => alert.id)).toEqual(
      expect.arrayContaining(['failed-enabled-schedules', 'due-runs-pending'])
    );
  });

  it('returns a healthy info alert when no risks exist', () => {
    const alerts = buildLeadershipReportHealthAlerts({
      schedules: [createSchedule()],
      history: [],
      runtime: createRuntime(),
    });

    expect(alerts).toEqual([
      expect.objectContaining({
        id: 'healthy',
        severity: 'info',
      }),
    ]);
  });

  it('flags missing webhook targets for webhook delivery schedules', () => {
    const alerts = buildLeadershipReportHealthAlerts({
      schedules: [
        createSchedule({
          deliveryMode: 'webhook_summary',
          webhookUrls: [],
        }),
      ],
      history: [],
      runtime: createRuntime(),
    });

    expect(alerts[0]).toMatchObject({
      id: 'webhook-targets-missing',
      severity: 'critical',
    });
  });
});

describe('buildLeadershipReportEscalations', () => {
  it('escalates repeated failures as critical', () => {
    const escalations = buildLeadershipReportEscalations({
      schedules: [
        createSchedule({
          lastRunStatus: 'failed',
        }),
      ],
      history: [
        createHistory({ id: 'run-1' }),
        createHistory({ id: 'run-2' }),
      ],
      runtime: createRuntime(),
    });

    expect(escalations).toEqual([
      expect.objectContaining({
        scheduleId: 'daily_briefing',
        severity: 'critical',
        recentFailureCount: 2,
      }),
    ]);
  });

  it('escalates email-summary schedules when email delivery is not configured', () => {
    const escalations = buildLeadershipReportEscalations({
      schedules: [
        createSchedule({
          deliveryMode: 'email_summary',
          recipientEmails: ['leader@lokswami.com'],
        }),
      ],
      history: [],
      runtime: createRuntime({ emailDeliveryConfigured: false }),
    });

    expect(escalations[0]).toMatchObject({
      severity: 'critical',
      actionLabel: 'Fix Email Delivery',
    });
  });

  it('escalates webhook-summary schedules when webhook targets are missing', () => {
    const escalations = buildLeadershipReportEscalations({
      schedules: [
        createSchedule({
          deliveryMode: 'webhook_summary',
          webhookUrls: [],
        }),
      ],
      history: [],
      runtime: createRuntime(),
    });

    expect(escalations[0]).toMatchObject({
      severity: 'critical',
      actionLabel: 'Add Webhook Targets',
    });
  });
});
