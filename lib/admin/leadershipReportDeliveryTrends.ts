import type { LeadershipReportRunHistoryEntry } from '@/lib/storage/leadershipReportRunHistoryFile';

export type LeadershipReportTrendBucket = {
  dateKey: string;
  label: string;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
};

export type LeadershipReportProviderTrend = {
  key: string;
  label: string;
  currentRuns: number;
  previousRuns: number;
  deltaRuns: number;
  currentFailures: number;
  previousFailures: number;
  currentSuccessRate: number;
  previousSuccessRate: number;
  deltaSuccessRate: number;
};

export type LeadershipReportDeliveryTrends = {
  currentWindowLabel: string;
  previousWindowLabel: string;
  currentRuns: number;
  previousRuns: number;
  deltaRuns: number;
  currentSuccessRate: number;
  previousSuccessRate: number;
  deltaSuccessRate: number;
  currentFailures: number;
  previousFailures: number;
  deltaFailures: number;
  currentCronRuns: number;
  previousCronRuns: number;
  deltaCronRuns: number;
  dailyBuckets: LeadershipReportTrendBucket[];
  providerTrends: LeadershipReportProviderTrend[];
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function providerLabel(key: string) {
  switch (key) {
    case 'dashboard_link':
      return 'Dashboard Link';
    case 'markdown_export':
      return 'Markdown Export';
    case 'email_summary':
      return 'Email Summary';
    case 'generic_json':
      return 'Generic JSON';
    case 'slack':
      return 'Slack';
    case 'discord':
      return 'Discord';
    case 'teams':
      return 'Microsoft Teams';
    case 'telegram':
      return 'Telegram';
    default:
      return key.replace(/_/g, ' ');
  }
}

function resolveProviderKey(entry: LeadershipReportRunHistoryEntry) {
  if (entry.deliveryMode !== 'webhook_summary') {
    return entry.deliveryMode;
  }

  return entry.webhookProvider || 'generic_json';
}

function computeSuccessRate(total: number, success: number) {
  return total ? Math.round((success / total) * 100) : 0;
}

export function getLeadershipReportDeliveryTrends(
  history: LeadershipReportRunHistoryEntry[],
  windowDays = 7,
  now = new Date()
): LeadershipReportDeliveryTrends {
  const today = startOfDay(now);
  const currentWindowStart = addDays(today, -(windowDays - 1));
  const previousWindowStart = addDays(currentWindowStart, -windowDays);
  const previousWindowEnd = addDays(currentWindowStart, -1);

  const normalizedHistory = history
    .map((entry) => ({
      ...entry,
      createdAtDate: new Date(entry.createdAt),
    }))
    .filter((entry) => !Number.isNaN(entry.createdAtDate.getTime()));

  const currentEntries = normalizedHistory.filter(
    (entry) => entry.createdAtDate >= currentWindowStart && entry.createdAtDate <= now
  );
  const previousEntries = normalizedHistory.filter(
    (entry) =>
      entry.createdAtDate >= previousWindowStart && entry.createdAtDate <= previousWindowEnd
  );

  const currentSuccessRuns = currentEntries.filter((entry) => entry.status === 'success').length;
  const previousSuccessRuns = previousEntries.filter((entry) => entry.status === 'success').length;
  const currentFailures = currentEntries.filter((entry) => entry.status === 'failed').length;
  const previousFailures = previousEntries.filter((entry) => entry.status === 'failed').length;
  const currentCronRuns = currentEntries.filter((entry) => entry.trigger === 'cron').length;
  const previousCronRuns = previousEntries.filter((entry) => entry.trigger === 'cron').length;

  const dailyBuckets: LeadershipReportTrendBucket[] = Array.from({ length: windowDays }).map(
    (_, index) => {
      const day = addDays(currentWindowStart, index);
      const key = dateKey(day);
      const entriesForDay = currentEntries.filter(
        (entry) => dateKey(startOfDay(entry.createdAtDate)) === key
      );

      return {
        dateKey: key,
        label: day.toLocaleDateString('en-IN', {
          month: 'short',
          day: '2-digit',
        }),
        totalRuns: entriesForDay.length,
        successRuns: entriesForDay.filter((entry) => entry.status === 'success').length,
        failedRuns: entriesForDay.filter((entry) => entry.status === 'failed').length,
      };
    }
  );

  const providerMap = new Map<string, LeadershipReportProviderTrend>();
  for (const entry of [...currentEntries, ...previousEntries]) {
    const key = resolveProviderKey(entry);
    const existing = providerMap.get(key) || {
      key,
      label: providerLabel(key),
      currentRuns: 0,
      previousRuns: 0,
      deltaRuns: 0,
      currentFailures: 0,
      previousFailures: 0,
      currentSuccessRate: 0,
      previousSuccessRate: 0,
      deltaSuccessRate: 0,
    };

    if (currentEntries.includes(entry)) {
      existing.currentRuns += 1;
      if (entry.status === 'failed') {
        existing.currentFailures += 1;
      }
    } else {
      existing.previousRuns += 1;
      if (entry.status === 'failed') {
        existing.previousFailures += 1;
      }
    }

    providerMap.set(key, existing);
  }

  const providerTrends = Array.from(providerMap.values())
    .map((trend) => ({
      ...trend,
      deltaRuns: trend.currentRuns - trend.previousRuns,
      currentSuccessRate: computeSuccessRate(
        trend.currentRuns,
        trend.currentRuns - trend.currentFailures
      ),
      previousSuccessRate: computeSuccessRate(
        trend.previousRuns,
        trend.previousRuns - trend.previousFailures
      ),
      deltaSuccessRate:
        computeSuccessRate(trend.currentRuns, trend.currentRuns - trend.currentFailures) -
        computeSuccessRate(trend.previousRuns, trend.previousRuns - trend.previousFailures),
    }))
    .sort((left, right) => {
      const currentDiff = right.currentRuns - left.currentRuns;
      if (currentDiff !== 0) return currentDiff;
      return right.previousRuns - left.previousRuns;
    });

  return {
    currentWindowLabel: `Last ${windowDays} Days`,
    previousWindowLabel: `Previous ${windowDays} Days`,
    currentRuns: currentEntries.length,
    previousRuns: previousEntries.length,
    deltaRuns: currentEntries.length - previousEntries.length,
    currentSuccessRate: computeSuccessRate(currentEntries.length, currentSuccessRuns),
    previousSuccessRate: computeSuccessRate(previousEntries.length, previousSuccessRuns),
    deltaSuccessRate:
      computeSuccessRate(currentEntries.length, currentSuccessRuns) -
      computeSuccessRate(previousEntries.length, previousSuccessRuns),
    currentFailures,
    previousFailures,
    deltaFailures: currentFailures - previousFailures,
    currentCronRuns,
    previousCronRuns,
    deltaCronRuns: currentCronRuns - previousCronRuns,
    dailyBuckets,
    providerTrends,
  };
}
