import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/environment';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/auth';
// import paymentRoutes from './routes/payments';
// import subscriptionRoutes from './routes/subscriptions';
// import invoiceRoutes from './routes/invoices';
// import webhookRoutes from './routes/webhooks';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.frontend.allowedOrigins,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.env,
  });
});

// API routes
app.use('/api/auth', authRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/subscriptions', subscriptionRoutes);
// app.use('/api/invoices', invoiceRoutes);
// app.use('/api/webhooks', webhookRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = config.app.port;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${config.app.env} mode`);
  logger.info(`📝 API available at http://localhost:${PORT}/api`);
  logger.info(`❤️  Health check at http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
