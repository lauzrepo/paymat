import { Resend } from 'resend';
import { config } from '../config/environment';

const resend = new Resend(config.email.resendApiKey);
const FROM = 'Paymat <noreply@paymat.com>';

export async function sendFeedbackNotification(submission: {
  id: string;
  name: string;
  email?: string | null;
  type: string;
  subject: string;
  message: string;
  organizationName: string;
}) {
  const adminUrl = `${config.email.appUrl}/feedback/${submission.id}`;

  await resend.emails.send({
    from: FROM,
    to: config.email.superAdminEmail,
    subject: `[${submission.type.toUpperCase()}] ${submission.subject} — ${submission.organizationName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#7c3aed">New ${submission.type} submission</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tr><td style="padding:6px 0;color:#6b7280;width:120px">Organization</td><td><strong>${submission.organizationName}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">From</td><td>${submission.name}${submission.email ? ` &lt;${submission.email}&gt;` : ''}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Subject</td><td>${submission.subject}</td></tr>
        </table>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;white-space:pre-wrap">${submission.message}</div>
        <a href="${adminUrl}" style="background:#7c3aed;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">View in Paymat</a>
      </div>
    `,
  });
}

export async function sendInviteEmail(invite: {
  token: string;
  recipientEmail: string;
  recipientName: string;
  orgName: string;
}) {
  const onboardingUrl = `${config.email.appUrl}/onboarding?token=${invite.token}`;

  await resend.emails.send({
    from: FROM,
    to: invite.recipientEmail,
    subject: `You're invited to set up ${invite.orgName} on Paymat`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#7c3aed;padding:24px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">Welcome to Paymat</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px">
          <p style="font-size:16px;color:#111827">Hi ${invite.recipientName},</p>
          <p style="color:#6b7280">You've been invited to set up <strong>${invite.orgName}</strong> on Paymat — the all-in-one platform for managing memberships, billing, and payments.</p>
          <p style="color:#6b7280">Click the button below to get started. You'll be guided through creating your account and configuring your organization. This link expires in 7 days.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${onboardingUrl}" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600">Set Up My Account</a>
          </div>
          <p style="color:#9ca3af;font-size:12px">If you didn't expect this email, you can safely ignore it.</p>
        </div>
      </div>
    `,
  });
}
