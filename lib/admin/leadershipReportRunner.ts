import { maybeNotifyLeadershipReportCriticalAlerts } from '@/lib/admin/leadershipReportCriticalAlertNotifier';
import { getLeadershipReportPreset, type LeadershipReportPresetId } from '@/lib/admin/leadershipReports';
import { sendLeadershipReportEmail } from '@/lib/notifications/leadershipReportEmail';
import { sendLeadershipReportWebhook } from '@/lib/notifications/leadershipReportWebhook';
import { createLeadershipReportRunHistory } from '@/lib/storage/leadershipReportRunHistoryFile';
import {
  isLeadershipReportScheduleDue,
  listLeadershipReportSchedules,
  recordLeadershipReportRun,
  type LeadershipReportSchedule,
} from '@/lib/storage/leadershipReportSchedulesFile';

export type LeadershipReportRunResult = {
  ok: boolean;
  schedule: LeadershipReportSchedule | null;
  report: Awaited<ReturnType<typeof getLeadershipReportPreset>> | null;
  summary: string;
  historyEntry?: Awaited<ReturnType<typeof createLeadershipReportRunHistory>>;
  error?: string;
};

function getHistoryRecipients(schedule: LeadershipReportSchedule) {
  return schedule.deliveryMode === 'email_summary' ? schedule.recipientEmails : [];
}

function getHistoryWebhookProvider(schedule: LeadershipReportSchedule) {
  return schedule.deliveryMode === 'webhook_summary' ? schedule.webhookProvider : null;
}

function formatWebhookProviderLabel(provider: LeadershipReportSchedule['webhookProvider']) {
  switch (provider) {
    case 'slack':
      return 'Slack';
    case 'discord':
      return 'Discord';
    case 'teams':
      return 'Microsoft Teams';
    case 'telegram':
      return 'Telegram';
    case 'generic_json':
    default:
      return 'Generic Webhook';
  }
}

export async function runLeadershipReportSchedule(
  id: LeadershipReportPresetId,
  options?: {
    trigger?: 'manual' | 'cron';
    actorEmail?: string | null;
  }
): Promise<LeadershipReportRunResult> {
  const schedules = await listLeadershipReportSchedules();
  const scheduleConfig = schedules.find((schedule) => schedule.id === id);
  const trigger = options?.trigger || 'manual';
  const actorEmail = options?.actorEmail || null;

  if (!scheduleConfig) {
    return {
      ok: false,
      schedule: null,
      report: null,
      summary: '',
      error: 'Leadership report schedule not found.',
    };
  }

  try {
    const report = await getLeadershipReportPreset(id);
    let runSummary = report.headline;

    if (scheduleConfig.deliveryMode === 'email_summary') {
      const emailResult = await sendLeadershipReportEmail({
        to: scheduleConfig.recipientEmails,
        report,
      });

      if (!emailResult.sent) {
        const schedule = await recordLeadershipReportRun({
          id,
          status: 'failed',
          summary: emailResult.error || 'Leadership email delivery failed.',
        });
        const historyEntry = await createLeadershipReportRunHistory({
          scheduleId: id,
          label: scheduleConfig.label,
          cadenceLabel: scheduleConfig.cadenceLabel,
          deliveryMode: scheduleConfig.deliveryMode,
          webhookProvider: getHistoryWebhookProvider(scheduleConfig),
          recipientEmails: getHistoryRecipients(scheduleConfig),
          trigger,
          actorEmail,
          status: 'failed',
          summary: schedule.lastRunSummary,
        });

        return {
          ok: false,
          schedule,
          report,
          summary: schedule.lastRunSummary,
          historyEntry,
          error: emailResult.error || 'Leadership email delivery failed.',
        };
      }

      runSummary = `Delivered to ${emailResult.deliveredTo?.join(', ') || 'configured recipients'}.`;
    }

    if (scheduleConfig.deliveryMode === 'webhook_summary') {
      const webhookResult = await sendLeadershipReportWebhook({
        urls: scheduleConfig.webhookUrls,
        provider: scheduleConfig.webhookProvider,
        report,
      });

      if (!webhookResult.sent) {
        const schedule = await recordLeadershipReportRun({
          id,
          status: 'failed',
          summary: webhookResult.error || 'Leadership webhook delivery failed.',
        });
        const historyEntry = await createLeadershipReportRunHistory({
          scheduleId: id,
          label: scheduleConfig.label,
          cadenceLabel: scheduleConfig.cadenceLabel,
          deliveryMode: scheduleConfig.deliveryMode,
          webhookProvider: getHistoryWebhookProvider(scheduleConfig),
          recipientEmails: [],
          trigger,
          actorEmail,
          status: 'failed',
          summary: schedule.lastRunSummary,
        });

        return {
          ok: false,
          schedule,
          report,
          summary: schedule.lastRunSummary,
          historyEntry,
          error: webhookResult.error || 'Leadership webhook delivery failed.',
        };
      }

      runSummary = `Delivered via ${formatWebhookProviderLabel(scheduleConfig.webhookProvider)} to ${webhookResult.deliveredTo?.length || 0} webhook target(s).`;
    }

    const schedule = await recordLeadershipReportRun({
      id,
      status: 'success',
      summary: runSummary,
    });
    const historyEntry = await createLeadershipReportRunHistory({
      scheduleId: id,
      label: scheduleConfig.label,
      cadenceLabel: scheduleConfig.cadenceLabel,
      deliveryMode: scheduleConfig.deliveryMode,
      webhookProvider: getHistoryWebhookProvider(scheduleConfig),
      recipientEmails: getHistoryRecipients(scheduleConfig),
      trigger,
      actorEmail,
      status: 'success',
      summary: runSummary,
    });

    return {
      ok: true,
      schedule,
      report,
      summary: runSummary,
      historyEntry,
    };
  } catch (error) {
    const schedule = await recordLeadershipReportRun({
      id,
      status: 'failed',
      summary: error instanceof Error ? error.message : 'Leadership report run failed.',
    }).catch(() => null);
    const historyEntry = scheduleConfig
      ? await createLeadershipReportRunHistory({
          scheduleId: id,
          label: scheduleConfig.label,
          cadenceLabel: scheduleConfig.cadenceLabel,
          deliveryMode: scheduleConfig.deliveryMode,
          webhookProvider: getHistoryWebhookProvider(scheduleConfig),
          recipientEmails: getHistoryRecipients(scheduleConfig),
          trigger,
          actorEmail,
          status: 'failed',
          summary: schedule?.lastRunSummary || 'Leadership report run failed.',
        }).catch(() => undefined)
      : undefined;

    return {
      ok: false,
      schedule,
      report: null,
      summary: schedule?.lastRunSummary || '',
      historyEntry,
      error: 'Failed to generate leadership report.',
    };
  }
}

export async function runDueLeadershipReportSchedules(now = new Date()) {
  const schedules = await listLeadershipReportSchedules();
  const dueSchedules = schedules.filter((schedule) => isLeadershipReportScheduleDue(schedule, now));

  const results = [];
  for (const schedule of dueSchedules) {
    results.push(
      await runLeadershipReportSchedule(schedule.id, {
        trigger: 'cron',
        actorEmail: null,
      })
    );
  }

  const criticalAlertNotification = await maybeNotifyLeadershipReportCriticalAlerts().catch(
    (error) => {
      console.error('Leadership critical alert notification failed:', error);
      return {
        sent: false,
        skipped: true,
        alertCount: 0,
        reason: 'Critical alert notification failed.',
        emailRecipients: [],
        webhookTargets: 0,
      };
    }
  );

  return {
    dueCount: dueSchedules.length,
    runCount: results.length,
    results,
    criticalAlertNotification,
  };
}

export async function runFailedLeadershipReportSchedules(options?: {
  actorEmail?: string | null;
}) {
  const schedules = await listLeadershipReportSchedules();
  const failedSchedules = schedules.filter((schedule) => schedule.lastRunStatus === 'failed');

  const results = [];
  for (const schedule of failedSchedules) {
    results.push(
      await runLeadershipReportSchedule(schedule.id, {
        trigger: 'manual',
        actorEmail: options?.actorEmail || null,
      })
    );
  }

  return {
    failedCount: failedSchedules.length,
    retryCount: results.length,
    results,
  };
}
