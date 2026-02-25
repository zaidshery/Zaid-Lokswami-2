const RESEND_API_URL = 'https://api.resend.com/emails';

type ContactAckEmailInput = {
  to: string;
  name: string;
  ticketId: string;
  subject: string;
};

export type ContactAckEmailResult = {
  sent: boolean;
  skipped?: boolean;
  error?: string;
};

function clean(value: unknown, maxLength = 200) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function getResendConfig() {
  const apiKey = clean(process.env.RESEND_API_KEY, 200);
  const from = clean(process.env.CONTACT_ACK_FROM_EMAIL || process.env.RESEND_FROM_EMAIL, 200);
  return { apiKey, from };
}

export function isContactAckEmailEnabled() {
  const { apiKey, from } = getResendConfig();
  return Boolean(apiKey && from);
}

function buildEmailBody(input: ContactAckEmailInput) {
  const safeName = clean(input.name, 120) || 'Reader';
  const safeSubject = clean(input.subject, 200) || 'Contact request';
  const safeTicketId = clean(input.ticketId, 64);

  const text = [
    `Hi ${safeName},`,
    '',
    'We have received your message at Lokswami.',
    `Ticket ID: ${safeTicketId}`,
    `Subject: ${safeSubject}`,
    '',
    'Our team usually replies within 24 business hours.',
    'Please keep this ticket ID for follow-up.',
    '',
    'Regards,',
    'Lokswami Support Team',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px;margin:0 auto;padding:18px 14px;">
      <h2 style="margin:0 0 12px;font-size:22px;color:#111827;">We received your message</h2>
      <p style="margin:0 0 10px;">Hi <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 10px;">Thanks for contacting Lokswami. Your request has been logged.</p>
      <div style="margin:12px 0;padding:12px;border:1px solid #E5E7EB;border-radius:10px;background:#F9FAFB;">
        <p style="margin:0 0 8px;"><strong>Ticket ID:</strong> ${safeTicketId}</p>
        <p style="margin:0;"><strong>Subject:</strong> ${safeSubject}</p>
      </div>
      <p style="margin:0 0 10px;">Our team usually replies within 24 business hours.</p>
      <p style="margin:0;">Please keep this ticket ID for follow-up.</p>
      <p style="margin:18px 0 0;">Regards,<br />Lokswami Support Team</p>
    </div>
  `;

  return { text, html };
}

export async function sendContactAcknowledgementEmail(
  input: ContactAckEmailInput
): Promise<ContactAckEmailResult> {
  const to = clean(input.to, 180).toLowerCase();
  if (!to) {
    return { sent: false, error: 'Missing recipient email' };
  }

  const { apiKey, from } = getResendConfig();
  if (!apiKey || !from) {
    return { sent: false, skipped: true, error: 'Email provider not configured' };
  }

  const body = buildEmailBody(input);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Lokswami Ticket ${input.ticketId}`,
        text: body.text,
        html: body.html,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorPayload = await response.text().catch(() => '');
      return {
        sent: false,
        error:
          errorPayload.slice(0, 200) ||
          `Email service returned status ${response.status}`,
      };
    }

    return { sent: true };
  } catch {
    return { sent: false, error: 'Email delivery failed' };
  }
}
