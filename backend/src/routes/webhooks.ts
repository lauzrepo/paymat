import { Router } from 'express';
import { webhookLimiter } from '../middleware/rateLimiter';
import { handleHelcimWebhook, handleStripeWebhook, handleStripeConnectWebhook } from '../controllers/webhookController';

const router = Router();

// Raw body is required for signature verification — applied in server.ts before json()
router.post('/helcim', webhookLimiter, handleHelcimWebhook);
router.post('/stripe', webhookLimiter, handleStripeWebhook);
router.post('/stripe-connect', webhookLimiter, handleStripeConnectWebhook);

export default router;
