import { isLeadershipReportEmailEnabled } from '@/lib/notifications/leadershipReportEmail';
import type { LeadershipReportRunHistoryEntry } from '@/lib/storage/leadershipReportRunHistoryFile';
import {
  isLeadershipReportScheduleDue,
  listLeadershipReportSchedules,
  type LeadershipReportSchedule,
} from '@/lib/storage/leadershipReportSchedulesFile';

export type LeadershipReportRuntimeSnapshot = {
  cronSecretConfigured: boolean;
  emailDeliveryConfigured: boolean;
  resendConfigured: boolean;
  fromEmailConfigured: boolean;
  dueNowCount: number;
  dueNowIds: Array<LeadershipReportSchedule['id']>;
};

export type LeadershipReportHealthAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
};

export type LeadershipReportEscalation = {
  scheduleId: LeadershipReportSchedule['id'];
  label: string;
  severity: 'critical' | 'warning';
  reason: string;
  recentFailureCount: number;
  actionHref: string;
  actionLabel: string;
};

export async function getLeadershipReportRuntimeSnapshot(
  schedules?: LeadershipReportSchedule[]
): Promise<LeadershipReportRuntimeSnapshot> {
  const resolvedSchedules = schedules || (await listLeadershipReportSchedules());
  const dueNowSchedules = resolvedSchedules.filter((schedule) =>
    isLeadershipReportScheduleDue(schedule)
  );

  return {
    cronSecretConfigured: Boolean(process.env.LEADERSHIP_REPORT_CRON_SECRET?.trim()),
    emailDeliveryConfigured: isLeadershipReportEmailEnabled(),
    resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    fromEmailConfigured: Boolean(
      process.env.LEADERSHIP_REPORT_FROM_EMAIL?.trim() || process.env.RESEND_FROM_EMAIL?.trim()
    ),
    dueNowCount: dueNowSchedules.length,
    dueNowIds: dueNowSchedules.map((schedule) => schedule.id),
  };
}

export function buildLeadershipReportHealthAlerts(args: {
  schedules: LeadershipReportSchedule[];
  history: LeadershipReportRunHistoryEntry[];
  runtime: LeadershipReportRuntimeSnapshot;
}): LeadershipReportHealthAlert[] {
  const { schedules, history, runtime } = args;
  const alerts: LeadershipReportHealthAlert[] = [];

  const enabledSchedules = schedules.filter((schedule) => schedule.enabled);
  const failedEnabledSchedules = enabledSchedules.filter(
    (schedule) => schedule.lastRunStatus === 'failed'
  );
  const emailSchedulesWithoutDelivery = enabledSchedules.filter(
    (schedule) => schedule.deliveryMode === 'email_summary' && !runtime.emailDeliveryConfigured
  );
  const webhookSchedulesWithoutTargets = enabledSchedules.filter(
    (schedule) => schedule.deliveryMode === 'webhook_summary' && !schedule.webhookUrls.length
  );
  const recentFailedRuns = history.filter((entry) => entry.status === 'failed');
  const pausedSchedules = schedules.filter((schedule) => !schedule.enabled);

  if (emailSchedulesWithoutDelivery.length > 0) {
    alerts.push({
      id: 'email-delivery-missing',
      severity: 'critical',
      title: 'Email delivery is not ready',
      detail: `${emailSchedulesWithoutDelivery.length} enabled schedule(s) are set to Email Summary, but the email provider is not fully configured.`,
      actionHref: '/admin/settings',
      actionLabel: 'Open Settings',
    });
  }

  if (webhookSchedulesWithoutTargets.length > 0) {
    alerts.push({
      id: 'webhook-targets-missing',
      severity: 'critical',
      title: 'Webhook delivery has no targets',
      detail: `${webhookSchedulesWithoutTargets.length} enabled schedule(s) use Webhook Summary, but no webhook URLs are configured.`,
      actionHref: '/admin/analytics',
      actionLabel: 'Open Delivery Center',
    });
  }

  if (!runtime.cronSecretConfigured) {
    alerts.push({
      id: 'cron-secret-missing',
      severity: 'warning',
      title: 'Cron protection is missing',
      detail:
        'LEADERSHIP_REPORT_CRON_SECRET is not configured, so automated due-run execution is not safely protected yet.',
      actionHref: '/admin/settings',
      actionLabel: 'Review Cron Setup',
    });
  }

  if (failedEnabledSchedules.length > 0) {
    alerts.push({
      id: 'failed-enabled-schedules',
      severity: 'critical',
      title: 'Some active schedules are failing',
      detail: `${failedEnabledSchedules.length} enabled schedule(s) still show a failed last run and may need a retry or delivery fix.`,
      actionHref: '/admin/analytics',
      actionLabel: 'Open Delivery Center',
    });
  }

  if (runtime.dueNowCount > 0) {
    alerts.push({
      id: 'due-runs-pending',
      severity: 'warning',
      title: 'Due schedules are waiting to run',
      detail: `${runtime.dueNowCount} schedule(s) are due right now. Confirm cron execution or run them manually.`,
      actionHref: '/admin/settings',
      actionLabel: 'Run Due Schedules',
    });
  }

  if (recentFailedRuns.length >= 3) {
    alerts.push({
      id: 'repeated-failures',
      severity: 'warning',
      title: 'Repeated delivery failures detected',
      detail: `${recentFailedRuns.length} failed report run(s) are visible in recent history, which suggests a recurring delivery problem.`,
      actionHref: '/admin/analytics',
      actionLabel: 'Review Run History',
    });
  }

  if (pausedSchedules.length > 0) {
    alerts.push({
      id: 'paused-schedules',
      severity: 'info',
      title: 'Some schedules are paused',
      detail: `${pausedSchedules.length} schedule(s) are currently paused and will not run automatically until re-enabled.`,
      actionHref: '/admin/analytics',
      actionLabel: 'Review Schedules',
    });
  }

  if (!alerts.length) {
    alerts.push({
      id: 'healthy',
      severity: 'info',
      title: 'Delivery health looks stable',
      detail:
        'No active leadership reporting risks were detected from schedule state, runtime readiness, or recent run history.',
      actionHref: '/admin/analytics',
      actionLabel: 'Open Delivery Center',
    });
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 } as const;
  return alerts.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity]);
}

export function buildLeadershipReportEscalations(args: {
  schedules: LeadershipReportSchedule[];
  history: LeadershipReportRunHistoryEntry[];
  runtime: LeadershipReportRuntimeSnapshot;
}): LeadershipReportEscalation[] {
  const { schedules, history, runtime } = args;
  const escalations: LeadershipReportEscalation[] = [];

  for (const schedule of schedules) {
    const recentFailureCount = history.filter(
      (entry) => entry.scheduleId === schedule.id && entry.status === 'failed'
    ).length;
    const isEmailBlocked =
      schedule.enabled &&
      schedule.deliveryMode === 'email_summary' &&
      !runtime.emailDeliveryConfigured;
    const isWebhookBlocked =
      schedule.enabled &&
      schedule.deliveryMode === 'webhook_summary' &&
      !schedule.webhookUrls.length;
    const hasRepeatedFailures = schedule.enabled && schedule.lastRunStatus === 'failed' && recentFailureCount >= 2;
    const hasSingleFailure = schedule.enabled && schedule.lastRunStatus === 'failed';
    const dueAfterFailure = runtime.dueNowIds.includes(schedule.id) && recentFailureCount > 0;

    if (isEmailBlocked) {
      escalations.push({
        scheduleId: schedule.id,
        label: schedule.label,
        severity: 'critical',
        reason: 'Email Summary is enabled but the email provider is not fully configured.',
        recentFailureCount,
        actionHref: '/admin/settings',
        actionLabel: 'Fix Email Delivery',
      });
      continue;
    }

    if (isWebhookBlocked) {
      escalations.push({
        scheduleId: schedule.id,
        label: schedule.label,
        severity: 'critical',
        reason: 'Webhook Summary is enabled but no webhook URLs are configured.',
        recentFailureCount,
        actionHref: '/admin/analytics',
        actionLabel: 'Add Webhook Targets',
      });
      continue;
    }

    if (hasRepeatedFailures) {
      escalations.push({
        scheduleId: schedule.id,
        label: schedule.label,
        severity: 'critical',
        reason: `This schedule has failed repeatedly and now needs leadership attention before the next automatic run.`,
        recentFailureCount,
        actionHref: '/admin/analytics',
        actionLabel: 'Retry Failed Run',
      });
      continue;
    }

    if (hasSingleFailure || dueAfterFailure) {
      escalations.push({
        scheduleId: schedule.id,
        label: schedule.label,
        severity: 'warning',
        reason: hasSingleFailure
          ? 'The last run failed and should be reviewed or retried soon.'
          : 'This schedule is due again after earlier failures and should be checked before it slips.',
        recentFailureCount,
        actionHref: '/admin/analytics',
        actionLabel: 'Review Schedule',
      });
    }
  }

  const severityOrder = { critical: 0, warning: 1 } as const;
  return escalations.sort((left, right) => {
    const severityDiff = severityOrder[left.severity] - severityOrder[right.severity];
    if (severityDiff !== 0) return severityDiff;
    return right.recentFailureCount - left.recentFailureCount;
  });
}
