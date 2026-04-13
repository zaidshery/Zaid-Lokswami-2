import { describe, expect, it } from 'vitest';
import { buildLeadershipReportDeliveryPerformanceAlerts } from '@/lib/admin/leadershipReportDeliveryPerformanceAlerts';
import type { LeadershipReportDeliveryTrends } from '@/lib/admin/leadershipReportDeliveryTrends';

function createTrends(
  overrides: Partial<LeadershipReportDeliveryTrends> = {}
): LeadershipReportDeliveryTrends {
  return {
    currentWindowLabel: 'Last 7 Days',
    previousWindowLabel: 'Previous 7 Days',
    currentRuns: 6,
    previousRuns: 6,
    deltaRuns: 0,
    currentSuccessRate: 100,
    previousSuccessRate: 100,
    deltaSuccessRate: 0,
    currentFailures: 0,
    previousFailures: 0,
    deltaFailures: 0,
    currentCronRuns: 4,
    previousCronRuns: 4,
    deltaCronRuns: 0,
    dailyBuckets: [],
    providerTrends: [],
    ...overrides,
  };
}

describe('buildLeadershipReportDeliveryPerformanceAlerts', () => {
  it('returns a stable info alert when no deterioration is detected', () => {
    const alerts = buildLeadershipReportDeliveryPerformanceAlerts(createTrends());

    expect(alerts).toEqual([
      expect.objectContaining({
        id: 'delivery-performance-stable',
        severity: 'info',
      }),
    ]);
  });

  it('flags a sharp overall success-rate decline', () => {
    const alerts = buildLeadershipReportDeliveryPerformanceAlerts(
      createTrends({
        currentSuccessRate: 50,
        previousSuccessRate: 100,
        deltaSuccessRate: -50,
        currentFailures: 3,
        previousFailures: 0,
        deltaFailures: 3,
      })
    );

    expect(alerts.map((alert) => alert.id)).toEqual(
      expect.arrayContaining(['success-rate-decline', 'failure-volume-rising'])
    );
    expect(alerts.find((alert) => alert.id === 'success-rate-decline')).toMatchObject({
      severity: 'critical',
    });
  });

  it('flags provider-specific deterioration', () => {
    const alerts = buildLeadershipReportDeliveryPerformanceAlerts(
      createTrends({
        providerTrends: [
          {
            key: 'slack',
            label: 'Slack',
            currentRuns: 3,
            previousRuns: 3,
            deltaRuns: 0,
            currentFailures: 2,
            previousFailures: 0,
            currentSuccessRate: 33,
            previousSuccessRate: 100,
            deltaSuccessRate: -67,
          },
        ],
      })
    );

    expect(alerts.map((alert) => alert.id)).toEqual(
      expect.arrayContaining(['provider-success-drop-slack', 'provider-failures-rising-slack'])
    );
  });
});
