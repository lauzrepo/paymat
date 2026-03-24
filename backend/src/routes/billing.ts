import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { runBilling } from '../controllers/billingController';

const router = Router();

// Auth is optional — controller accepts JWT admin OR X-Billing-Secret header
router.post('/run', optionalAuth, runBilling);

export default router;
