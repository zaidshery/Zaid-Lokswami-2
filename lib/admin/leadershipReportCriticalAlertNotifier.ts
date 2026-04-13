import { buildLeadershipReportDeliveryPerformanceAlerts } from '@/lib/admin/leadershipReportDeliveryPerformanceAlerts';
import { getLeadershipReportDeliveryTrends } from '@/lib/admin/leadershipReportDeliveryTrends';
import { sendLeadershipReportCriticalAlertEmail } from '@/lib/notifications/leadershipReportEmail';
import { sendLeadershipReportCriticalAlertWebhook } from '@/lib/notifications/leadershipReportWebhook';
import { createLeadershipReportAlertNotificationHistory } from '@/lib/storage/leadershipReportAlertNotificationHistoryFile';
import { listLeadershipReportRunHistory } from '@/lib/storage/leadershipReportRunHistoryFile';
import {
  getLeadershipReportCriticalAlertState,
  isLeadershipReportCriticalAlertsMuted,
  saveLeadershipReportCriticalAlertState,
} from '@/lib/storage/leadershipReportCriticalAlertStateFile';
import {
  listLeadershipReportSchedules,
  type LeadershipReportWebhookProvider,
} from '@/lib/storage/leadershipReportSchedulesFile';

export type LeadershipReportCriticalAlertNotificationSummary = {
  sent: boolean;
  skipped: boolean;
  alertCount: number;
  reason: string;
  emailRecipients: string[];
  webhookTargets: number;
};

function buildSignature(alerts: Array<{ id: string; detail: string }>) {
  return alerts
    .map((alert) => `${alert.id}:${alert.detail}`)
    .sort()
    .join('|');
}

function uniqueStrings(values: string[]) {
  return values.filter((value, index, source) => value && source.indexOf(value) === index);
}

export async function maybeNotifyLeadershipReportCriticalAlerts(): Promise<LeadershipReportCriticalAlertNotificationSummary> {
  const [history, schedules, state] = await Promise.all([
    listLeadershipReportRunHistory(60),
    listLeadershipReportSchedules(),
    getLeadershipReportCriticalAlertState(),
  ]);

  const trends = getLeadershipReportDeliveryTrends(history);
  const criticalAlerts = buildLeadershipReportDeliveryPerformanceAlerts(trends).filter(
    (alert) => alert.severity === 'critical'
  );

  if (!criticalAlerts.length) {
    if (state.activeAlertIds.length || state.lastAlertSignature) {
      await saveLeadershipReportCriticalAlertState({
        activeAlertIds: [],
        lastAlertSignature: '',
        lastNotifiedAt: state.lastNotifiedAt,
        mutedUntil: state.mutedUntil,
        mutedByEmail: state.mutedByEmail,
        mutedReason: state.mutedReason,
      });
    }

    return {
      sent: false,
      skipped: true,
      alertCount: 0,
      reason: 'No critical delivery alerts are active.',
      emailRecipients: [],
      webhookTargets: 0,
    };
  }

  if (isLeadershipReportCriticalAlertsMuted(state)) {
    return {
      sent: false,
      skipped: true,
      alertCount: criticalAlerts.length,
      reason: `Critical alert notifications are muted until ${state.mutedUntil}.`,
      emailRecipients: [],
      webhookTargets: 0,
    };
  }

  const signature = buildSignature(criticalAlerts);
  if (state.lastAlertSignature === signature) {
    return {
      sent: false,
      skipped: true,
      alertCount: criticalAlerts.length,
      reason: 'Critical alert set already notified.',
      emailRecipients: [],
      webhookTargets: 0,
    };
  }

  const enabledSchedules = schedules.filter((schedule) => schedule.enabled);
  const emailRecipients = uniqueStrings(
    enabledSchedules
      .filter((schedule) => schedule.deliveryMode === 'email_summary')
      .flatMap((schedule) => schedule.recipientEmails)
  );
  const webhookGroups = new Map<
    LeadershipReportWebhookProvider,
    string[]
  >();
  for (const schedule of enabledSchedules.filter(
    (candidate) => candidate.deliveryMode === 'webhook_summary'
  )) {
    const existing = webhookGroups.get(schedule.webhookProvider) || [];
    webhookGroups.set(
      schedule.webhookProvider,
      uniqueStrings([...existing, ...schedule.webhookUrls])
    );
  }

  let webhookTargets = 0;
  let attempted = false;
  const failures: string[] = [];
  const deliveredEmailRecipients: string[] = [];

  if (emailRecipients.length) {
    attempted = true;
    const emailResult = await sendLeadershipReportCriticalAlertEmail({
      to: emailRecipients,
      alerts: criticalAlerts,
      trends,
    }).catch((error) => {
      console.error('Leadership critical alert email notification failed.', error);
      return { sent: false, error: 'Email delivery failed' };
    });
    if (emailResult.sent) {
      deliveredEmailRecipients.push(
        ...('deliveredTo' in emailResult && Array.isArray(emailResult.deliveredTo)
          ? emailResult.deliveredTo
          : [])
      );
    } else if (emailResult.error) {
      failures.push(emailResult.error);
    }
  }

  for (const [provider, urls] of webhookGroups.entries()) {
    if (!urls.length) continue;
    attempted = true;
    const webhookResult = await sendLeadershipReportCriticalAlertWebhook({
      urls,
      provider,
      alerts: criticalAlerts,
      trends,
    }).catch((error) => {
      console.error('Leadership critical alert webhook notification failed.', error);
      return { sent: false, error: `${provider} webhook delivery failed` };
    });
    if (webhookResult.sent) {
      webhookTargets +=
        'deliveredTo' in webhookResult && Array.isArray(webhookResult.deliveredTo)
          ? webhookResult.deliveredTo.length
          : 0;
    } else if (webhookResult.error) {
      failures.push(webhookResult.error);
    }
  }

  if (!attempted) {
    await createLeadershipReportAlertNotificationHistory({
      status: 'failed',
      alertCount: criticalAlerts.length,
      alertIds: criticalAlerts.map((alert) => alert.id),
      reason: 'Critical alerts were detected, but no configured delivery targets were available.',
      emailRecipients: [],
      webhookTargets: 0,
    });
    return {
      sent: false,
      skipped: true,
      alertCount: criticalAlerts.length,
      reason: 'No configured delivery targets are available for critical alert notifications.',
      emailRecipients: [],
      webhookTargets: 0,
    };
  }

  const sent = deliveredEmailRecipients.length > 0 || webhookTargets > 0;
  const reason =
    sent && failures.length
      ? `Notified leadership about ${criticalAlerts.length} critical delivery alert(s), but some channels failed: ${failures.join('; ')}`
      : sent
        ? `Notified leadership about ${criticalAlerts.length} critical delivery alert(s).`
        : `Failed to deliver critical alert notifications. ${failures.join('; ') || 'No successful delivery target responded.'}`;

  await createLeadershipReportAlertNotificationHistory({
    status: sent ? 'sent' : 'failed',
    alertCount: criticalAlerts.length,
    alertIds: criticalAlerts.map((alert) => alert.id),
    reason,
    emailRecipients: deliveredEmailRecipients,
    webhookTargets,
  });

  if (sent) {
    await saveLeadershipReportCriticalAlertState({
      activeAlertIds: criticalAlerts.map((alert) => alert.id),
      lastAlertSignature: signature,
      lastNotifiedAt: new Date().toISOString(),
    });
  }

  return {
    sent,
    skipped: false,
    alertCount: criticalAlerts.length,
    reason,
    emailRecipients: deliveredEmailRecipients,
    webhookTargets,
  };
}
