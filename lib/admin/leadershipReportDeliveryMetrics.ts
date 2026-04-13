import type { LeadershipReportRunHistoryEntry } from '@/lib/storage/leadershipReportRunHistoryFile';
import type {
  LeadershipReportSchedule,
  LeadershipReportWebhookProvider,
} from '@/lib/storage/leadershipReportSchedulesFile';

export type LeadershipReportDeliveryChannelKey =
  | 'dashboard_link'
  | 'markdown_export'
  | 'email_summary'
  | 'webhook_summary'
  | LeadershipReportWebhookProvider;

export type LeadershipReportDeliveryProviderMetric = {
  key: LeadershipReportDeliveryChannelKey;
  label: string;
  enabledSchedules: number;
  recentRuns: number;
  successRuns: number;
  failedRuns: number;
};

export type LeadershipReportDeliveryMetrics = {
  totalSchedules: number;
  enabledSchedules: number;
  recentRuns: number;
  successRuns: number;
  failedRuns: number;
  cronRuns: number;
  manualRuns: number;
  successRate: number;
  enabledWebhookSchedules: number;
  enabledEmailSchedules: number;
  modeBreakdown: Array<{
    mode: LeadershipReportSchedule['deliveryMode'];
    label: string;
    count: number;
  }>;
  providerBreakdown: LeadershipReportDeliveryProviderMetric[];
};

function formatChannelLabel(key: LeadershipReportDeliveryChannelKey) {
  switch (key) {
    case 'dashboard_link':
      return 'Dashboard Link';
    case 'markdown_export':
      return 'Markdown Export';
    case 'email_summary':
      return 'Email Summary';
    case 'webhook_summary':
      return 'Webhook Summary';
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
      return String(key);
  }
}

function resolveChannelKey(
  mode: LeadershipReportSchedule['deliveryMode'],
  webhookProvider: LeadershipReportWebhookProvider | null | undefined
): LeadershipReportDeliveryChannelKey {
  if (mode !== 'webhook_summary') {
    return mode;
  }

  return webhookProvider || 'generic_json';
}

export function getLeadershipReportDeliveryMetrics(args: {
  schedules: LeadershipReportSchedule[];
  history: LeadershipReportRunHistoryEntry[];
}): LeadershipReportDeliveryMetrics {
  const { schedules, history } = args;
  const scheduleById = new Map(schedules.map((schedule) => [schedule.id, schedule]));

  const modeCounts = new Map<LeadershipReportSchedule['deliveryMode'], number>();
  const providerMap = new Map<LeadershipReportDeliveryChannelKey, LeadershipReportDeliveryProviderMetric>();

  for (const schedule of schedules) {
    if (schedule.enabled) {
      modeCounts.set(
        schedule.deliveryMode,
        (modeCounts.get(schedule.deliveryMode) || 0) + 1
      );
    }

    const key = resolveChannelKey(schedule.deliveryMode, schedule.webhookProvider);
    const current = providerMap.get(key) || {
      key,
      label: formatChannelLabel(key),
      enabledSchedules: 0,
      recentRuns: 0,
      successRuns: 0,
      failedRuns: 0,
    };
    if (schedule.enabled) {
      current.enabledSchedules += 1;
    }
    providerMap.set(key, current);
  }

  let successRuns = 0;
  let failedRuns = 0;
  let cronRuns = 0;
  let manualRuns = 0;

  for (const entry of history) {
    const schedule = scheduleById.get(entry.scheduleId);
    const key = resolveChannelKey(
      entry.deliveryMode,
      entry.webhookProvider || schedule?.webhookProvider || null
    );
    const current = providerMap.get(key) || {
      key,
      label: formatChannelLabel(key),
      enabledSchedules: 0,
      recentRuns: 0,
      successRuns: 0,
      failedRuns: 0,
    };

    current.recentRuns += 1;
    if (entry.status === 'success') {
      current.successRuns += 1;
      successRuns += 1;
    }
    if (entry.status === 'failed') {
      current.failedRuns += 1;
      failedRuns += 1;
    }
    if (entry.trigger === 'cron') {
      cronRuns += 1;
    } else {
      manualRuns += 1;
    }

    providerMap.set(key, current);
  }

  const recentRuns = history.length;
  const successRate = recentRuns ? Math.round((successRuns / recentRuns) * 100) : 0;

  return {
    totalSchedules: schedules.length,
    enabledSchedules: schedules.filter((schedule) => schedule.enabled).length,
    recentRuns,
    successRuns,
    failedRuns,
    cronRuns,
    manualRuns,
    successRate,
    enabledWebhookSchedules: schedules.filter(
      (schedule) => schedule.enabled && schedule.deliveryMode === 'webhook_summary'
    ).length,
    enabledEmailSchedules: schedules.filter(
      (schedule) => schedule.enabled && schedule.deliveryMode === 'email_summary'
    ).length,
    modeBreakdown: (
      ['dashboard_link', 'markdown_export', 'email_summary', 'webhook_summary'] as const
    ).map((mode) => ({
      mode,
      label: formatChannelLabel(mode),
      count: modeCounts.get(mode) || 0,
    })),
    providerBreakdown: Array.from(providerMap.values()).sort((left, right) => {
      const enabledDiff = right.enabledSchedules - left.enabledSchedules;
      if (enabledDiff !== 0) return enabledDiff;
      return right.recentRuns - left.recentRuns;
    }),
  };
}
