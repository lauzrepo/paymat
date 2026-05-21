import { Router } from 'express';
import { optionalAuth, authenticateToken, requireRole } from '../middleware/auth';
import { runBilling } from '../controllers/billingController';
import { getBillingStatus, getOwnPortalLink, getConnectDashboardLink } from '../controllers/stripeBillingController';
import {
  getMonthlyStatement, downloadMonthlyStatement, emailMonthlyStatement,
  getAnnualSummary, downloadAnnualSummary, emailAnnualSummary,
} from '../controllers/reportController';

const router = Router();

router.post('/run', optionalAuth, runBilling);

router.get('/status', authenticateToken, requireRole('admin'), getBillingStatus);
router.post('/portal', authenticateToken, requireRole('admin'), getOwnPortalLink);
router.post('/connect-dashboard', authenticateToken, requireRole('admin'), getConnectDashboardLink);

const adminAuth = [authenticateToken, requireRole('admin')] as const;
router.get('/reports/monthly/:year/:month', ...adminAuth, getMonthlyStatement);
router.get('/reports/monthly/:year/:month/download', ...adminAuth, downloadMonthlyStatement);
router.post('/reports/monthly/:year/:month/email', ...adminAuth, emailMonthlyStatement);
router.get('/reports/annual/:year', ...adminAuth, getAnnualSummary);
router.get('/reports/annual/:year/download', ...adminAuth, downloadAnnualSummary);
router.post('/reports/annual/:year/email', ...adminAuth, emailAnnualSummary);

export default router;
