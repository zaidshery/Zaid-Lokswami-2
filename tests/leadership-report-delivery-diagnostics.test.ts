import { describe, expect, it } from 'vitest';
import {
  getLeadershipReportDeliveryDiagnostics,
  type LeadershipReportDeliveryScheduleLike,
} from '@/lib/admin/leadershipReportDeliveryDiagnostics';

function createSchedule(
  overrides: Partial<LeadershipReportDeliveryScheduleLike> = {}
): LeadershipReportDeliveryScheduleLike {
  return {
    id: 'daily_briefing',
    label: 'Daily Briefing',
    enabled: true,
    deliveryMode: 'dashboard_link',
    recipientEmails: [],
    webhookUrls: [],
    webhookProvider: 'generic_json',
    ...overrides,
  };
}

describe('getLeadershipReportDeliveryDiagnostics', () => {
  it('flags missing email recipients and missing email runtime', () => {
    const diagnostics = getLeadershipReportDeliveryDiagnostics(
      createSchedule({
        deliveryMode: 'email_summary',
      }),
      { emailDeliveryConfigured: false }
    );

    expect(diagnostics.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'daily_briefing-missing-recipients',
        'daily_briefing-email-runtime',
      ])
    );
  });

  it('flags mismatched Slack webhook URLs', () => {
    const diagnostics = getLeadershipReportDeliveryDiagnostics(
      createSchedule({
        deliveryMode: 'webhook_summary',
        webhookProvider: 'slack',
        webhookUrls: ['https://example.com/not-slack'],
      }),
      { emailDeliveryConfigured: true }
    );

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'daily_briefing-provider-mismatch',
          severity: 'warning',
        }),
      ])
    );
  });

  it('marks valid Telegram webhook targets as ready', () => {
    const diagnostics = getLeadershipReportDeliveryDiagnostics(
      createSchedule({
        deliveryMode: 'webhook_summary',
        webhookProvider: 'telegram',
        webhookUrls: ['https://api.telegram.org/bot123:abc/sendMessage'],
      }),
      { emailDeliveryConfigured: true }
    );

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'daily_briefing-webhook-ready',
          severity: 'info',
        }),
      ])
    );
  });
});
