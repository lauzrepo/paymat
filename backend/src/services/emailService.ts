import { Resend } from 'resend';
import { config } from '../config/environment';
import type { MonthlyStatement, AnnualSummary } from './reportService';

const resend = new Resend(config.email.resendApiKey);
const FROM = 'Cliq Paymat <noreply@cliqpaymat.app>';

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

export async function sendInvoiceGenerated(to: string, details: {
  recipientName: string;
  orgName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: Date;
  programName: string;
  portalUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Invoice ${details.invoiceNumber} from ${details.orgName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#4f46e5;padding:24px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">New Invoice</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px">
          <p style="font-size:16px;color:#111827">Hi ${details.recipientName},</p>
          <p style="color:#6b7280">A new invoice has been generated for your ${details.orgName} membership.</p>
          <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:4px 0;color:#6b7280;width:140px">Invoice</td><td style="font-weight:600;color:#111827">${details.invoiceNumber}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Program</td><td style="color:#111827">${details.programName}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Amount due</td><td style="font-weight:700;color:#111827;font-size:18px">$${details.amount.toFixed(2)} ${details.currency}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Due date</td><td style="color:#111827">${details.dueDate.toLocaleDateString()}</td></tr>
            </table>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="${details.portalUrl}" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">Pay Now</a>
          </div>
          <p style="color:#9ca3af;font-size:12px">Log in to your member portal to view the invoice and pay online.</p>
        </div>
      </div>
    `,
  });
}

export async function sendPaymentReceived(to: string, details: {
  recipientName: string;
  orgName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Payment received — ${details.invoiceNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#059669;padding:24px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">Payment Confirmed</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px">
          <p style="font-size:16px;color:#111827">Hi ${details.recipientName},</p>
          <p style="color:#6b7280">Your payment for <strong>${details.orgName}</strong> has been processed successfully.</p>
          <div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:4px 0;color:#6b7280;width:140px">Invoice</td><td style="font-weight:600;color:#111827">${details.invoiceNumber}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Amount paid</td><td style="font-weight:700;color:#059669;font-size:18px">$${details.amount.toFixed(2)} ${details.currency}</td></tr>
            </table>
          </div>
          <p style="color:#9ca3af;font-size:12px">Thank you for your payment. Keep this email as your receipt.</p>
        </div>
      </div>
    `,
  });
}

export async function sendPaymentFailed(to: string, details: {
  recipientName: string;
  orgName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  portalUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Payment failed — action required for ${details.invoiceNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#dc2626;padding:24px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">Payment Failed</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px">
          <p style="font-size:16px;color:#111827">Hi ${details.recipientName},</p>
          <p style="color:#6b7280">We were unable to process your payment of <strong>$${details.amount.toFixed(2)} ${details.currency}</strong> for <strong>${details.orgName}</strong>.</p>
          <div style="background:#fef2f2;border-radius:8px;padding:20px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:4px 0;color:#6b7280;width:140px">Invoice</td><td style="font-weight:600;color:#111827">${details.invoiceNumber}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Amount due</td><td style="font-weight:700;color:#dc2626;font-size:18px">$${details.amount.toFixed(2)} ${details.currency}</td></tr>
            </table>
          </div>
          <p style="color:#6b7280">Please log in to your member portal to update your payment method or pay manually.</p>
          <div style="text-align:center;margin:24px 0">
            <a href="${details.portalUrl}" style="background:#dc2626;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">Pay Now</a>
          </div>
        </div>
      </div>
    `,
  });
}

function invitePricingCallout(platformFeePercent?: number): string {
  if (platformFeePercent === 0.05) {
    return `
      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-left:4px solid #7c3aed;border-radius:6px;padding:20px;margin:24px 0">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.05em">Founding Member Pricing — Closes June 1, 2026</p>
        <p style="margin:0 0 12px;font-size:15px;color:#111827">As a founding member, you're locked in at a <strong>0.05% platform fee + Stripe's transaction fee</strong> — for life.</p>
        <p style="margin:0;font-size:13px;color:#6b7280">This is our lowest rate ever — well below the standard 2% after launch. The founding member offer closes June 1, 2026 to new organizations, but your rate is tied to your account permanently and will never increase.</p>
      </div>`;
  }
  if (platformFeePercent === 1) {
    return `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #3b82f6;border-radius:6px;padding:20px;margin:24px 0">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.05em">Early Adopter Pricing — Limited Offer</p>
        <p style="margin:0 0 12px;font-size:15px;color:#111827">As an early adopter, you're locked in at a <strong>1% platform fee</strong> — for life.</p>
        <p style="margin:0;font-size:13px;color:#6b7280">This rate is reserved for a limited number of organizations joining during our early growth phase — well below the standard 2% charged to new organizations after launch. It stays with your account permanently.</p>
      </div>`;
  }
  return '';
}

export async function sendInviteEmail(invite: {
  token: string;
  recipientEmail: string;
  recipientName: string;
  orgName: string;
  platformFeePercent?: number;
}) {
  const onboardingUrl = `${config.email.appUrl}/onboarding?token=${invite.token}`;

  await resend.emails.send({
    from: FROM,
    to: invite.recipientEmail,
    subject: `You're invited to set up ${invite.orgName} on Cliqpaymat`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#7c3aed;padding:24px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">Welcome to Cliqpaymat</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px">
          <p style="font-size:16px;color:#111827">Hi ${invite.recipientName},</p>
          <p style="color:#6b7280">You've been invited to set up <strong>${invite.orgName}</strong> on Cliqpaymat — the all-in-one platform for managing memberships, billing, and payments — built for your business.</p>

          ${invitePricingCallout(invite.platformFeePercent)}

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

export async function sendOrgPaymentReceipt(to: string, details: {
  orgAdminName: string;
  orgName: string;
  memberName: string;
  invoiceNumber: string;
  grossAmount: number;
  platformFee: number;
  stripeFee: number | null;
  netAmount: number | null;
  currency: string;
}) {
  const fmt = (n: number) => `$${n.toFixed(2)} ${details.currency}`;
  const stripeFeeRow = details.stripeFee !== null
    ? `<tr><td style="padding:4px 0;color:#6b7280;width:160px">Stripe processing fee</td><td style="color:#dc2626">−${fmt(details.stripeFee)}</td></tr>`
    : `<tr><td style="padding:4px 0;color:#6b7280;width:160px">Stripe processing fee</td><td style="color:#6b7280">~${fmt(details.grossAmount * 0.029 + 0.30)} (est.)</td></tr>`;
  const netRow = details.netAmount !== null
    ? `<tr style="border-top:1px solid #e5e7eb"><td style="padding:8px 0 4px;color:#111827;font-weight:600">Net to your account</td><td style="font-weight:700;color:#059669;font-size:16px">${fmt(details.netAmount)}</td></tr>`
    : '';

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Payment received — ${details.invoiceNumber} (${details.orgName})`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#059669;padding:24px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">Payment Received</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px">
          <p style="font-size:16px;color:#111827">Hi ${details.orgAdminName},</p>
          <p style="color:#6b7280">A payment has been collected for <strong>${details.orgName}</strong>. Here's the full breakdown:</p>
          <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:4px 0;color:#6b7280;width:160px">Member</td><td style="color:#111827">${details.memberName}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Invoice</td><td style="font-weight:600;color:#111827">${details.invoiceNumber}</td></tr>
              <tr style="border-top:1px solid #e5e7eb"><td style="padding:8px 0 4px;color:#6b7280">Gross payment</td><td style="font-weight:700;color:#111827;font-size:16px">${fmt(details.grossAmount)}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Cliqpaymat fee</td><td style="color:#dc2626">−${fmt(details.platformFee)}</td></tr>
              ${stripeFeeRow}
              ${netRow}
            </table>
          </div>
          <p style="color:#9ca3af;font-size:12px">This breakdown is for your records only and is not visible to your members.</p>
        </div>
      </div>
    `,
  });
}

export async function sendStripeOnboardingEmail(to: string, details: {
  recipientName: string;
  orgName: string;
  onboardingUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Action required: complete Stripe onboarding for ${details.orgName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#7c3aed;padding:24px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">You're going live!</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px">
          <p style="font-size:16px;color:#111827">Hi ${details.recipientName},</p>
          <p style="color:#6b7280"><strong>${details.orgName}</strong> has been approved to accept real payments on Cliqpaymat. To get started, you'll need to complete your Stripe onboarding — this takes about 5–10 minutes and requires your business and bank details.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${details.onboardingUrl}" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600">Complete Stripe Onboarding</a>
          </div>
          <p style="color:#6b7280;font-size:14px">This link is unique to your account. Once onboarding is complete, your organization will be able to accept live payments immediately.</p>
          <p style="color:#9ca3af;font-size:12px">If you didn't expect this email, please contact support.</p>
        </div>
      </div>
    `,
  });
}

export async function sendSuperAdminPasswordReset(to: string, details: {
  recipientName: string;
  resetUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Paymat super admin password',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#7c3aed;padding:24px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">Super Admin Password Reset</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px">
          <p style="font-size:16px;color:#111827">Hi ${details.recipientName},</p>
          <p style="color:#6b7280">We received a request to reset your super admin password. Click the button below to choose a new one. This link expires in 1 hour.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${details.resetUrl}" style="background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">Reset Password</a>
          </div>
          <p style="color:#9ca3af;font-size:12px">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
        </div>
      </div>
    `,
  });
}

export async function sendPasswordReset(to: string, details: {
  recipientName: string;
  resetUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Cliqpaymat password',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#4f46e5;padding:24px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">Password Reset</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px">
          <p style="font-size:16px;color:#111827">Hi ${details.recipientName},</p>
          <p style="color:#6b7280">We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${details.resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">Reset Password</a>
          </div>
          <p style="color:#9ca3af;font-size:12px">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
        </div>
      </div>
    `,
  });
}

export async function sendInviteAccepted(to: string, details: {
  recipientName: string;
  orgName: string;
  orgSlug: string;
}) {
  const adminUrl = config.email.appUrl;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${details.orgName} is live on Cliqpaymat`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#059669;padding:24px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">You're all set!</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px">
          <p style="font-size:16px;color:#111827">Hi ${details.recipientName},</p>
          <p style="color:#6b7280"><strong>${details.orgName}</strong> has been successfully set up on Cliqpaymat. Your account is ready to go.</p>
          <div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:6px 0;color:#6b7280;width:140px">Organization</td><td style="font-weight:600;color:#111827">${details.orgName}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Org slug</td><td style="font-weight:700;color:#111827;font-family:monospace;font-size:15px">${details.orgSlug}</td></tr>
            </table>
          </div>
          <p style="color:#6b7280;font-size:14px">Your org slug is your unique identifier — it's used for your member portal URL and anywhere you need to reference your account. Keep it handy.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${adminUrl}" style="background:#059669;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600">Go to Dashboard</a>
          </div>
          <p style="color:#9ca3af;font-size:12px">If you have any questions getting started, reply to this email and we'll help you out.</p>
        </div>
      </div>
    `,
  });
}

export async function sendMonthlyStatement(to: string, stmt: MonthlyStatement) {
  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const paymentRows = stmt.payments.map((p) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px">${p.date}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:13px">${p.invoiceNumber}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right">${fmt(p.amount)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:13px;text-transform:capitalize">${p.method}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:13px;color:${p.status === 'succeeded' ? '#059669' : p.status === 'refunded' ? '#d97706' : '#6b7280'}">${p.status}</td>
    </tr>`).join('');

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${stmt.monthName} ${stmt.year} Statement — ${stmt.orgName}`,
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto">
        <div style="background:#4f46e5;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">Monthly Statement</h1>
          <p style="color:#c7d2fe;margin:4px 0 0;font-size:14px">${stmt.monthName} ${stmt.year} — ${stmt.orgName}</p>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px">
          <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;width:180px">Invoices created</td><td style="font-weight:600;color:#111827;font-size:14px">${stmt.summary.invoicesCreated}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Total invoiced</td><td style="font-weight:600;color:#111827;font-size:14px">${fmt(stmt.summary.totalInvoiced)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Total collected</td><td style="font-weight:700;color:#059669;font-size:16px">${fmt(stmt.summary.totalCollected)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Total refunded</td><td style="font-weight:600;color:#d97706;font-size:14px">${fmt(stmt.summary.totalRefunded)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Outstanding</td><td style="font-weight:600;color:#111827;font-size:14px">${fmt(stmt.summary.outstanding)}</td></tr>
          </table>
          ${stmt.payments.length > 0 ? `
          <h3 style="font-size:14px;font-weight:600;color:#111827;margin:0 0 8px">Payments (${stmt.payments.length})</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <thead><tr style="background:#f9fafb">
              <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600">Date</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600">Invoice</th>
              <th style="padding:8px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600">Amount</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600">Method</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600">Status</th>
            </tr></thead>
            <tbody>${paymentRows}</tbody>
          </table>` : ''}
          <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">Log in to your Paymat admin panel to download a full CSV of this statement.</p>
        </div>
      </div>
    `,
  });
}

export async function sendAnnualSummary(to: string, summary: AnnualSummary) {
  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const monthRows = summary.months
    .filter((m) => m.grossCollected > 0 || m.refunded > 0)
    .map((m) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:13px">${m.monthName}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;color:#059669">${fmt(m.grossCollected)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;color:${m.refunded > 0 ? '#d97706' : '#9ca3af'}">${fmt(m.refunded)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;font-weight:600;color:#111827">${fmt(m.netRevenue)}</td>
      </tr>`).join('');

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${summary.year} Annual Revenue Summary — ${summary.orgName}`,
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto">
        <div style="background:#4f46e5;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">Annual Revenue Summary</h1>
          <p style="color:#c7d2fe;margin:4px 0 0;font-size:14px">${summary.year} — ${summary.orgName}</p>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px">
          <div style="background:#f0fdf4;border-radius:8px;padding:20px;margin-bottom:28px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:4px 0;color:#6b7280;font-size:14px;width:180px">Gross collected</td><td style="font-weight:700;color:#059669;font-size:20px">${fmt(summary.totals.grossCollected)}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280;font-size:14px">Total refunded</td><td style="color:#d97706;font-size:14px;font-weight:600">${fmt(summary.totals.refunded)}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280;font-size:14px">Net revenue</td><td style="font-weight:700;color:#111827;font-size:18px">${fmt(summary.totals.netRevenue)}</td></tr>
            </table>
          </div>
          ${monthRows ? `
          <h3 style="font-size:14px;font-weight:600;color:#111827;margin:0 0 8px">Monthly Breakdown</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <thead><tr style="background:#f9fafb">
              <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600">Month</th>
              <th style="padding:8px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600">Gross</th>
              <th style="padding:8px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600">Refunds</th>
              <th style="padding:8px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600">Net</th>
            </tr></thead>
            <tbody>${monthRows}</tbody>
          </table>` : '<p style="color:#9ca3af;font-size:13px">No payments recorded for this year.</p>'}
          <p style="color:#9ca3af;font-size:11px;margin:24px 0 0;border-top:1px solid #f3f4f6;padding-top:16px">This summary is provided for reference only and is not an official IRS 1099 form. Download a full CSV from your Paymat admin panel.</p>
        </div>
      </div>
    `,
  });
}
