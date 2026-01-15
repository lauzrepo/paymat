import { Router } from 'express';
import * as webhookController from '../controllers/webhookController';

const router = Router();

/**
 * @route   POST /api/webhooks/helcim
 * @desc    Handle Helcim webhooks
 * @access  Public (but signature verified)
 */
router.post('/helcim', webhookController.handleHelcimWebhook);

export default router;
