import type { LeadershipReport } from '@/lib/admin/leadershipReports';
import type { LeadershipReportDeliveryPerformanceAlert } from '@/lib/admin/leadershipReportDeliveryPerformanceAlerts';
import type { LeadershipReportDeliveryTrends } from '@/lib/admin/leadershipReportDeliveryTrends';

const RESEND_API_URL = 'https://api.resend.com/emails';
const FALLBACK_SITE_URL = 'http://localhost:3000';

type LeadershipReportEmailInput = {
  to: string[];
  report: LeadershipReport;
};

type LeadershipReportCriticalAlertEmailInput = {
  to: string[];
  alerts: LeadershipReportDeliveryPerformanceAlert[];
  trends: LeadershipReportDeliveryTrends;
};

export type LeadershipReportEmailResult = {
  sent: boolean;
  skipped?: boolean;
  error?: string;
  deliveredTo?: string[];
};

export type LeadershipReportEmailPreview = {
  subject: string;
  text: string;
  html: string;
};

function clean(value: unknown, maxLength = 240) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeEmails(values: string[]) {
  return values
    .map((value) => clean(value, 180).toLowerCase())
    .filter((value, index, source) => value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && source.indexOf(value) === index)
    .slice(0, 20);
}

function getOrigin() {
  return clean(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || FALLBACK_SITE_URL, 300).replace(/\/+$/, '');
}

function getResendConfig() {
  const apiKey = clean(process.env.RESEND_API_KEY, 240);
  const from = clean(
    process.env.LEADERSHIP_REPORT_FROM_EMAIL || process.env.RESEND_FROM_EMAIL,
    240
  );
  return { apiKey, from };
}

export function isLeadershipReportEmailEnabled() {
  const { apiKey, from } = getResendConfig();
  return Boolean(apiKey && from);
}

export function buildLeadershipReportEmailPreview(
  report: LeadershipReport
): LeadershipReportEmailPreview {
  const origin = getOrigin();
  const absoluteViewHref = `${origin}${report.viewHref}`;

  const metricsText = report.metrics
    .map((metric) => `- ${metric.label}: ${metric.value} (${metric.detail})`)
    .join('\n');

  const winsText = report.wins.length ? report.wins.map((item) => `- ${item}`).join('\n') : '- No standout positive signals.';
  const risksText = report.risks.length ? report.risks.map((item) => `- ${item}`).join('\n') : '- No major leadership risks.';
  const growthText = report.growthHighlights?.length
    ? report.growthHighlights.map((item) => `- ${item.title}: ${item.detail}`).join('\n')
    : '- No growth snapshot signals.';
  const growthOpportunityText = report.growthOpportunities?.length
    ? report.growthOpportunities
        .map((item) => `- ${item.title} (score ${item.score}): ${item.detail}`)
        .join('\n')
    : '- No growth opportunities.';
  const actionsText = report.actions.map((item) => `- ${item.label}: ${origin}${item.href}`).join('\n');

  const text = [
    `${report.label}`,
    '',
    `Reporting Window: ${report.windowLabel}`,
    `Comparison: ${report.comparisonLabel || 'Off'}`,
    '',
    report.headline,
    '',
    report.summary,
    '',
    'Key Metrics',
    metricsText,
    '',
    'Positive Signals',
    winsText,
    '',
    'Leadership Risks',
    risksText,
    '',
    'Growth Snapshot',
    growthText,
    '',
    'Growth Opportunities',
    growthOpportunityText,
    '',
    'Recommended Actions',
    actionsText,
    '',
    `Open dashboard view: ${absoluteViewHref}`,
  ].join('\n');

  const metricsHtml = report.metrics
    .map(
      (metric) => `
        <div style="border:1px solid #E5E7EB;border-radius:12px;padding:12px;background:#F9FAFB;">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6B7280;">${metric.label}</p>
          <p style="margin:8px 0 0;font-size:24px;font-weight:800;color:#111827;">${metric.value}</p>
          <p style="margin:8px 0 0;font-size:13px;color:#374151;">${metric.detail}</p>
        </div>
      `
    )
    .join('');

  const winsHtml = report.wins.length
    ? report.wins.map((item) => `<li style="margin:0 0 8px;">${item}</li>`).join('')
    : '<li style="margin:0 0 8px;">No standout positive signals.</li>';
  const risksHtml = report.risks.length
    ? report.risks.map((item) => `<li style="margin:0 0 8px;">${item}</li>`).join('')
    : '<li style="margin:0 0 8px;">No major leadership risks.</li>';
  const growthHtml = report.growthHighlights?.length
    ? report.growthHighlights
        .map(
          (item) => `<li style="margin:0 0 8px;"><strong>${item.title}</strong><br /><span style="color:#374151;">${item.detail}</span></li>`
        )
        .join('')
    : '<li style="margin:0 0 8px;">No growth snapshot signals.</li>';
  const growthOpportunityHtml = report.growthOpportunities?.length
    ? report.growthOpportunities
        .map(
          (item) =>
            `<li style="margin:0 0 8px;"><strong>${item.title}</strong> <span style="color:#6B7280;">(score ${item.score})</span><br /><span style="color:#374151;">${item.detail}</span></li>`
        )
        .join('')
    : '<li style="margin:0 0 8px;">No growth opportunities.</li>';
  const actionsHtml = report.actions
    .map(
      (item) =>
        `<li style="margin:0 0 8px;"><a href="${origin}${item.href}" style="color:#B91C1C;text-decoration:none;font-weight:600;">${item.label}</a></li>`
    )
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:720px;margin:0 auto;padding:20px 16px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#DC2626;">${report.cadenceLabel}</p>
      <h1 style="margin:0 0 10px;font-size:28px;color:#111827;">${report.label}</h1>
      <p style="margin:0 0 8px;font-size:14px;color:#4B5563;">Reporting Window: <strong>${report.windowLabel}</strong></p>
      <p style="margin:0 0 20px;font-size:14px;color:#4B5563;">Comparison: <strong>${report.comparisonLabel || 'Off'}</strong></p>

      <div style="border:1px solid #F3F4F6;border-radius:16px;padding:16px;background:#FCFCFD;">
        <p style="margin:0 0 10px;font-size:18px;font-weight:800;color:#111827;">${report.headline}</p>
        <p style="margin:0;font-size:14px;color:#374151;">${report.summary}</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:20px 0;">
        ${metricsHtml}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div style="border:1px solid #E5E7EB;border-radius:16px;padding:16px;background:#F9FAFB;">
          <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Positive Signals</h2>
          <ul style="padding-left:18px;margin:0;font-size:14px;color:#374151;">${winsHtml}</ul>
        </div>
        <div style="border:1px solid #FECACA;border-radius:16px;padding:16px;background:#FEF2F2;">
          <h2 style="margin:0 0 12px;font-size:18px;color:#991B1B;">Leadership Risks</h2>
          <ul style="padding-left:18px;margin:0;font-size:14px;color:#7F1D1D;">${risksHtml}</ul>
        </div>
      </div>

      <div style="margin-top:20px;border:1px solid #E5E7EB;border-radius:16px;padding:16px;background:#F9FAFB;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Growth Snapshot</h2>
        <ul style="padding-left:18px;margin:0;font-size:14px;color:#374151;">${growthHtml}</ul>
      </div>

      <div style="margin-top:20px;border:1px solid #E5E7EB;border-radius:16px;padding:16px;background:#F9FAFB;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Growth Opportunities</h2>
        <ul style="padding-left:18px;margin:0;font-size:14px;color:#374151;">${growthOpportunityHtml}</ul>
      </div>

      <div style="margin-top:20px;border:1px solid #E5E7EB;border-radius:16px;padding:16px;background:#FFFFFF;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Recommended Actions</h2>
        <ul style="padding-left:18px;margin:0 0 16px;font-size:14px;color:#374151;">${actionsHtml}</ul>
        <a href="${absoluteViewHref}" style="display:inline-block;padding:12px 16px;border-radius:12px;background:#111827;color:#FFFFFF;text-decoration:none;font-weight:700;">Open Dashboard View</a>
      </div>
    </div>
  `;

  return {
    subject: `Lokswami ${report.label}`,
    text,
    html,
  };
}

export function buildLeadershipReportCriticalAlertEmailPreview(
  input: LeadershipReportCriticalAlertEmailInput
): LeadershipReportEmailPreview {
  const origin = getOrigin();
  const criticalAlerts = input.alerts.filter((alert) => alert.severity === 'critical');
  const alertItems = criticalAlerts
    .map((alert) => `- ${alert.title}: ${alert.detail}`)
    .join('\n');

  const text = [
    'Lokswami Critical Delivery Alert',
    '',
    `${input.trends.currentWindowLabel} vs ${input.trends.previousWindowLabel}`,
    '',
    `Current success rate: ${input.trends.currentSuccessRate}%`,
    `Current failures: ${input.trends.currentFailures}`,
    '',
    'Critical Signals',
    alertItems || '- No critical signals.',
    '',
    `Review analytics: ${origin}/admin/analytics`,
    `Review settings: ${origin}/admin/settings`,
  ].join('\n');

  const alertHtml = criticalAlerts.length
    ? criticalAlerts
        .map(
          (alert) => `
            <li style="margin:0 0 10px;">
              <strong>${alert.title}</strong><br />
              <span style="color:#7F1D1D;">${alert.detail}</span>
            </li>
          `
        )
        .join('')
    : '<li style="margin:0 0 10px;">No critical signals.</li>';

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:720px;margin:0 auto;padding:20px 16px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#DC2626;">Critical Delivery Alert</p>
      <h1 style="margin:0 0 10px;font-size:28px;color:#111827;">Lokswami Reporting Risk</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#4B5563;">${input.trends.currentWindowLabel} vs ${input.trends.previousWindowLabel}</p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:20px 0;">
        <div style="border:1px solid #E5E7EB;border-radius:12px;padding:12px;background:#F9FAFB;">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6B7280;">Success Rate</p>
          <p style="margin:8px 0 0;font-size:24px;font-weight:800;color:#111827;">${input.trends.currentSuccessRate}%</p>
        </div>
        <div style="border:1px solid #FECACA;border-radius:12px;padding:12px;background:#FEF2F2;">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#991B1B;">Failures</p>
          <p style="margin:8px 0 0;font-size:24px;font-weight:800;color:#991B1B;">${input.trends.currentFailures}</p>
        </div>
      </div>

      <div style="border:1px solid #FECACA;border-radius:16px;padding:16px;background:#FEF2F2;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#991B1B;">Critical Signals</h2>
        <ul style="padding-left:18px;margin:0;font-size:14px;color:#7F1D1D;">${alertHtml}</ul>
      </div>

      <div style="margin-top:20px;">
        <a href="${origin}/admin/analytics" style="display:inline-block;padding:12px 16px;border-radius:12px;background:#111827;color:#FFFFFF;text-decoration:none;font-weight:700;">Open Analytics Center</a>
      </div>
    </div>
  `;

  return {
    subject: 'Lokswami Critical Delivery Alert',
    text,
    html,
  };
}

export async function sendLeadershipReportEmail(
  input: LeadershipReportEmailInput
): Promise<LeadershipReportEmailResult> {
  const recipients = normalizeEmails(input.to);
  if (!recipients.length) {
    return { sent: false, error: 'Missing recipient emails' };
  }

  const { apiKey, from } = getResendConfig();
  if (!apiKey || !from) {
    return { sent: false, skipped: true, error: 'Email provider not configured' };
  }

  const preview = buildLeadershipReportEmailPreview(input.report);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: preview.subject,
        text: preview.text,
        html: preview.html,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorPayload = await response.text().catch(() => '');
      return {
        sent: false,
        error: errorPayload.slice(0, 240) || `Email service returned status ${response.status}`,
      };
    }

    return { sent: true, deliveredTo: recipients };
  } catch {
    return { sent: false, error: 'Email delivery failed' };
  }
}

export async function sendLeadershipReportCriticalAlertEmail(
  input: LeadershipReportCriticalAlertEmailInput
): Promise<LeadershipReportEmailResult> {
  const recipients = normalizeEmails(input.to);
  if (!recipients.length) {
    return { sent: false, error: 'Missing recipient emails' };
  }

  const { apiKey, from } = getResendConfig();
  if (!apiKey || !from) {
    return { sent: false, skipped: true, error: 'Email provider not configured' };
  }

  const preview = buildLeadershipReportCriticalAlertEmailPreview(input);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: preview.subject,
        text: preview.text,
        html: preview.html,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorPayload = await response.text().catch(() => '');
      return {
        sent: false,
        error: errorPayload.slice(0, 240) || `Email service returned status ${response.status}`,
      };
    }

    return { sent: true, deliveredTo: recipients };
  } catch {
    return { sent: false, error: 'Email delivery failed' };
  }
}
