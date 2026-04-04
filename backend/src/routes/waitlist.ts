import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Resend } from 'resend';
import { config } from '../config/environment';
import logger from '../utils/logger';

const router = Router();
const resend = new Resend(config.email.resendApiKey);

const schema = z.object({
  email: z.string().email(),
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: 'error', message: 'Valid email is required' });
    return;
  }

  const { email } = parsed.data;

  // Fire-and-forget both emails
  Promise.all([
    // Notify us
    resend.emails.send({
      from: 'Paymat <noreply@cliqpaymat.app>',
      to: config.email.superAdminEmail,
      subject: `New waitlist request: ${email}`,
      html: `<p><strong>${email}</strong> just requested early access to Paymat.</p>`,
    }),
    // Confirm to submitter
    resend.emails.send({
      from: 'Paymat <noreply@cliqpaymat.app>',
      to: email,
      subject: "You're on the Paymat waitlist",
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f0f13;color:#f5f5f7;">
          <h1 style="font-size:24px;font-weight:700;margin:0 0 12px;">You're on the list.</h1>
          <p style="color:#71717a;margin:0 0 24px;line-height:1.6;">
            Thanks for your interest in Paymat. We're onboarding businesses now
            and will reach out to <strong style="color:#f5f5f7;">${email}</strong> when your spot is ready.
          </p>
          <p style="color:#71717a;margin:0;font-size:14px;">— The Paymat team</p>
        </div>
      `,
    }),
  ]).catch(err => logger.error('Waitlist email error', { err }));

  logger.info(`Waitlist: new request from ${email}`);
  res.status(200).json({ status: 'success', message: 'You are on the waitlist' });
});

export default router;
