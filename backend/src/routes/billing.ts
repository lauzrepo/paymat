import { Router } from 'express';
import { optionalAuth, authenticateToken, requireRole } from '../middleware/auth';
import { runBilling } from '../controllers/billingController';
import { getBillingStatus, getOwnPortalLink } from '../controllers/stripeBillingController';

const router = Router();

// Billing run — accepts JWT admin OR X-Billing-Secret header
router.post('/run', optionalAuth, runBilling);

// Subscription status + portal — admin only
router.get('/status', authenticateToken, requireRole('admin'), getBillingStatus);
router.post('/portal', authenticateToken, requireRole('admin'), getOwnPortalLink);

export default router;
