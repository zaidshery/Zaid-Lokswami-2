export type LeadershipReportDeliveryMode =
  | 'dashboard_link'
  | 'markdown_export'
  | 'email_summary'
  | 'webhook_summary';

export type LeadershipReportWebhookProvider =
  | 'generic_json'
  | 'slack'
  | 'discord'
  | 'teams'
  | 'telegram';

export type LeadershipReportDeliveryScheduleLike = {
  id: string;
  label: string;
  enabled: boolean;
  deliveryMode: LeadershipReportDeliveryMode;
  recipientEmails: string[];
  webhookUrls: string[];
  webhookProvider: LeadershipReportWebhookProvider;
};

export type LeadershipReportDeliveryDiagnostic = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
};

function matchesSlackWebhook(url: string) {
  return /https:\/\/hooks\.slack\.com\/services\//i.test(url);
}

function matchesDiscordWebhook(url: string) {
  return /https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//i.test(url);
}

function matchesTeamsWebhook(url: string) {
  return (
    /https:\/\/[^/\s]+\.webhook\.office\.com\//i.test(url) ||
    /https:\/\/outlook\.office\.com\/webhook\//i.test(url) ||
    /https:\/\/[^/\s]*logic\.azure\.com\//i.test(url)
  );
}

function matchesTelegramWebhook(url: string) {
  return /https:\/\/api\.telegram\.org\/bot[^/\s]+\/sendMessage/i.test(url);
}

function countMismatchedUrls(
  urls: string[],
  provider: LeadershipReportWebhookProvider
) {
  if (provider === 'generic_json') return 0;

  const matcher =
    provider === 'slack'
      ? matchesSlackWebhook
      : provider === 'discord'
        ? matchesDiscordWebhook
        : provider === 'teams'
          ? matchesTeamsWebhook
          : matchesTelegramWebhook;

  return urls.filter((url) => !matcher(url)).length;
}

export function getLeadershipReportDeliveryDiagnostics(
  schedule: LeadershipReportDeliveryScheduleLike,
  options: {
    emailDeliveryConfigured?: boolean;
  } = {}
): LeadershipReportDeliveryDiagnostic[] {
  const diagnostics: LeadershipReportDeliveryDiagnostic[] = [];

  if (!schedule.enabled) {
    diagnostics.push({
      id: `${schedule.id}-paused`,
      severity: 'info',
      title: 'Schedule is paused',
      detail: 'This briefing will not run automatically until it is enabled again.',
    });
  }

  if (schedule.deliveryMode === 'dashboard_link') {
    diagnostics.push({
      id: `${schedule.id}-dashboard-link`,
      severity: 'info',
      title: 'Dashboard link delivery',
      detail: 'This mode shares the live Analytics Center view and does not need external delivery targets.',
    });
  }

  if (schedule.deliveryMode === 'markdown_export') {
    diagnostics.push({
      id: `${schedule.id}-markdown-export`,
      severity: 'info',
      title: 'Markdown export delivery',
      detail: 'This mode generates a downloadable markdown briefing and does not require recipients or webhook targets.',
    });
  }

  if (schedule.deliveryMode === 'email_summary') {
    if (!schedule.recipientEmails.length) {
      diagnostics.push({
        id: `${schedule.id}-missing-recipients`,
        severity: 'critical',
        title: 'Recipient emails are missing',
        detail: 'Add at least one recipient email before running Email Summary delivery.',
      });
    }

    if (!options.emailDeliveryConfigured) {
      diagnostics.push({
        id: `${schedule.id}-email-runtime`,
        severity: 'critical',
        title: 'Email provider is not configured',
        detail: 'Email Summary is selected, but the Resend API key or from-address is not ready yet.',
      });
    }

    if (schedule.recipientEmails.length && options.emailDeliveryConfigured) {
      diagnostics.push({
        id: `${schedule.id}-email-ready`,
        severity: 'info',
        title: 'Email delivery looks ready',
        detail: `This summary will send to ${schedule.recipientEmails.length} configured recipient(s).`,
      });
    }
  }

  if (schedule.deliveryMode === 'webhook_summary') {
    if (!schedule.webhookUrls.length) {
      diagnostics.push({
        id: `${schedule.id}-missing-webhooks`,
        severity: 'critical',
        title: 'Webhook targets are missing',
        detail: 'Add at least one webhook URL before running Webhook Summary delivery.',
      });
    }

    if (schedule.webhookUrls.length) {
      const mismatchedCount = countMismatchedUrls(
        schedule.webhookUrls,
        schedule.webhookProvider
      );

      if (mismatchedCount > 0) {
        diagnostics.push({
          id: `${schedule.id}-provider-mismatch`,
          severity: 'warning',
          title: 'Webhook URL pattern needs a check',
          detail:
            mismatchedCount === 1
              ? `One webhook target does not look like a valid ${schedule.webhookProvider.replace(/_/g, ' ')} endpoint.`
              : `${mismatchedCount} webhook targets do not look like valid ${schedule.webhookProvider.replace(/_/g, ' ')} endpoints.`,
        });
      } else {
        diagnostics.push({
          id: `${schedule.id}-webhook-ready`,
          severity: 'info',
          title: 'Webhook delivery looks ready',
          detail: `${schedule.webhookUrls.length} ${schedule.webhookProvider.replace(/_/g, ' ')} target(s) match the expected URL pattern.`,
        });
      }
    }
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 } as const;
  return diagnostics.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity]);
}
