import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cron from 'node-cron';
import { config } from './config/environment';
import logger from './utils/logger';
import billingService from './services/billingService';
import prisma from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { resolveTenant } from './middleware/tenant';

import superAdminRoutes from './routes/superAdmin';
import waitlistRoutes from './routes/waitlist';
import authRoutes from './routes/auth';
import organizationRoutes from './routes/tenant';
import contactRoutes from './routes/contacts';
import teamPublicRoutes from './routes/teamPublic';
import teamRoutes from './routes/team';
import familyRoutes from './routes/families';
import programRoutes from './routes/programs';
import enrollmentRoutes from './routes/enrollments';
import invoiceRoutes from './routes/invoices';
import paymentRoutes from './routes/payments';
import billingRoutes from './routes/billing';
import feedbackRoutes from './routes/feedback';
import clientRoutes from './routes/client';
import webhookRoutes from './routes/webhooks';
import assistantRoutes from './routes/assistant';

const app: Application = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.app.isDevelopment) return callback(null, true);
      if (config.frontend.allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Raw body for webhook signature verification — must come before express.json()
app.use('/webhooks', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Super-admin routes bypass tenant resolution — mount before resolveTenant
app.use('/super-admin', superAdminRoutes);

// Public team invite routes bypass tenant resolution (invitee has no org context)
app.use('/api/team', teamPublicRoutes);

app.use(resolveTenant);
app.use('/api', apiLimiter);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.env,
  });
});

app.use('/api/organization', organizationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/team', teamRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.app.port;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${config.app.env} mode`);
  logger.info(`📝 API available at http://localhost:${PORT}/api`);
  logger.info(`❤️  Health check at http://localhost:${PORT}/health`);
});

// Run billing at 8am in each org's local timezone — checked every hour
cron.schedule('0 * * * *', async () => {
  const now = new Date();
  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { id: true, name: true, timezone: true },
  });

  const dueOrgs = orgs.filter((org) => {
    try {
      const hour = parseInt(
        now.toLocaleString('en-US', { timeZone: org.timezone, hour: 'numeric', hour12: false }),
        10
      );
      return hour === 8;
    } catch {
      return false;
    }
  });

  if (dueOrgs.length === 0) return;

  logger.info(`Cron: billing due for ${dueOrgs.length} org(s) at local 8am`);
  for (const org of dueOrgs) {
    logger.info(`Cron: starting billing run for org ${org.name}`);
    try {
      const result = await billingService.generateDueInvoices(org.id);
      logger.info('Cron: billing run complete', { org: org.name, ...result });
    } catch (err) {
      logger.error('Cron: billing run failed', { org: org.name, err });
    }
  }
});

process.on('SIGTERM', () => {
  server.close(() => { logger.info('HTTP server closed'); process.exit(0); });
});

process.on('SIGINT', () => {
  server.close(() => { logger.info('HTTP server closed'); process.exit(0); });
});

export default app;
