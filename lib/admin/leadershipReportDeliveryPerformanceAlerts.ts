import type { LeadershipReportDeliveryTrends } from '@/lib/admin/leadershipReportDeliveryTrends';

export type LeadershipReportDeliveryPerformanceAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
};

export function buildLeadershipReportDeliveryPerformanceAlerts(
  trends: LeadershipReportDeliveryTrends
): LeadershipReportDeliveryPerformanceAlert[] {
  const alerts: LeadershipReportDeliveryPerformanceAlert[] = [];

  if (trends.previousRuns >= 3 && trends.currentRuns === 0) {
    alerts.push({
      id: 'delivery-volume-dropped-to-zero',
      severity: 'critical',
      title: 'Delivery activity dropped to zero',
      detail: `There were ${trends.previousRuns} run${trends.previousRuns === 1 ? '' : 's'} in ${trends.previousWindowLabel}, but none in ${trends.currentWindowLabel}.`,
    });
  }

  if (trends.currentRuns >= 3 && trends.deltaSuccessRate <= -20) {
    alerts.push({
      id: 'success-rate-decline',
      severity: trends.currentSuccessRate < 60 ? 'critical' : 'warning',
      title: 'Delivery success rate dropped sharply',
      detail: `Success rate moved from ${trends.previousSuccessRate}% to ${trends.currentSuccessRate}% across the last two delivery windows.`,
    });
  }

  if (trends.currentFailures >= 2 && trends.deltaFailures >= 2) {
    alerts.push({
      id: 'failure-volume-rising',
      severity:
        trends.currentFailures >= 4 || trends.currentSuccessRate < 50 ? 'critical' : 'warning',
      title: 'Delivery failures are rising',
      detail: `${trends.currentFailures} failed run${trends.currentFailures === 1 ? '' : 's'} were recorded in ${trends.currentWindowLabel}, up ${trends.deltaFailures} from the previous window.`,
    });
  }

  if (trends.previousCronRuns >= 2 && trends.deltaCronRuns <= -2) {
    alerts.push({
      id: 'cron-activity-down',
      severity: 'warning',
      title: 'Cron-driven delivery volume is down',
      detail: `Cron runs moved from ${trends.previousCronRuns} to ${trends.currentCronRuns}, which may indicate schedules are not executing consistently.`,
    });
  }

  const providerAlerts = trends.providerTrends
    .flatMap<LeadershipReportDeliveryPerformanceAlert>((provider) => {
      const next: LeadershipReportDeliveryPerformanceAlert[] = [];

      if (provider.currentRuns >= 2 && provider.previousRuns >= 2 && provider.deltaSuccessRate <= -25) {
        next.push({
          id: `provider-success-drop-${provider.key}`,
          severity: provider.currentSuccessRate < 50 ? 'critical' : 'warning',
          title: `${provider.label} performance weakened`,
          detail: `${provider.label} success rate moved from ${provider.previousSuccessRate}% to ${provider.currentSuccessRate}% between the last two 7-day windows.`,
        });
      }

      if (provider.currentFailures >= 2 && provider.currentFailures > provider.previousFailures) {
        next.push({
          id: `provider-failures-rising-${provider.key}`,
          severity: 'warning',
          title: `${provider.label} failures are climbing`,
          detail: `${provider.currentFailures} failed ${provider.label.toLowerCase()} run${provider.currentFailures === 1 ? '' : 's'} were recorded in ${trends.currentWindowLabel}.`,
        });
      }

      return next;
    })
    .slice(0, 4);

  alerts.push(...providerAlerts);

  if (!alerts.length) {
    return [
      {
        id: 'delivery-performance-stable',
        severity: 'info',
        title: 'Delivery performance is stable',
        detail: `No significant deterioration was detected between ${trends.previousWindowLabel} and ${trends.currentWindowLabel}.`,
      },
    ];
  }

  return alerts;
}
