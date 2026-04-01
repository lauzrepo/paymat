import { Router } from 'express';
import { handleHelcimWebhook, handleStripeWebhook, handleStripeConnectWebhook } from '../controllers/webhookController';

const router = Router();

// Raw body is required for signature verification — applied in server.ts before json()
router.post('/helcim', handleHelcimWebhook);
router.post('/stripe', handleStripeWebhook);
router.post('/stripe-connect', handleStripeConnectWebhook);

export default router;
