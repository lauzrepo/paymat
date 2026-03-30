import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cron from 'node-cron';
import { config } from './config/environment';
import logger from './utils/logger';
import billingService from './services/billingService';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { resolveTenant } from './middleware/tenant';

import superAdminRoutes from './routes/superAdmin';
import authRoutes from './routes/auth';
import organizationRoutes from './routes/tenant';
import contactRoutes from './routes/contacts';
import familyRoutes from './routes/families';
import programRoutes from './routes/programs';
import enrollmentRoutes from './routes/enrollments';
import invoiceRoutes from './routes/invoices';
import paymentRoutes from './routes/payments';
import billingRoutes from './routes/billing';
import feedbackRoutes from './routes/feedback';
import clientRoutes from './routes/client';
import webhookRoutes from './routes/webhooks';

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

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.app.port;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${config.app.env} mode`);
  logger.info(`📝 API available at http://localhost:${PORT}/api`);
  logger.info(`❤️  Health check at http://localhost:${PORT}/health`);
});

// Run billing every day at 6am UTC
cron.schedule('0 6 * * *', async () => {
  logger.info('Cron: starting daily billing run');
  try {
    const result = await billingService.generateDueInvoices();
    logger.info('Cron: billing run complete', result);
  } catch (err) {
    logger.error('Cron: billing run failed', { err });
  }
});

process.on('SIGTERM', () => {
  server.close(() => { logger.info('HTTP server closed'); process.exit(0); });
});

process.on('SIGINT', () => {
  server.close(() => { logger.info('HTTP server closed'); process.exit(0); });
});

export default app;
