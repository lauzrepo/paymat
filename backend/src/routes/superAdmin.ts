import { Router } from 'express';
import { authenticateSuperAdmin } from '../middleware/superAdminAuth';
import { authLimiter, apiLimiter } from '../middleware/rateLimiter';
import {
  superAdminLogin,
  superAdminRefreshToken,
  getSuperAdminMe,
  changeSuperAdminPassword,
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  setOrganizationActive,
  deleteOrganization,
  promoteOrganizationToProduction,
} from '../controllers/superAdminController';
import { createInvite, listInvites, verifyInvite, redeemInvite, resendInvite, deleteInvite } from '../controllers/inviteController';
import { sendCheckoutLink, getPortalLink } from '../controllers/stripeBillingController';

const router = Router();

// Auth — public
router.post('/auth/login', authLimiter, superAdminLogin);
router.post('/auth/refresh-token', authLimiter, superAdminRefreshToken);

// Auth — protected
router.get('/auth/me', apiLimiter, authenticateSuperAdmin, getSuperAdminMe);
router.post('/auth/change-password', authLimiter, authenticateSuperAdmin, changeSuperAdminPassword);

// Organizations — all protected
router.get('/organizations', apiLimiter, authenticateSuperAdmin, listOrganizations);
router.post('/organizations', apiLimiter, authenticateSuperAdmin, createOrganization);
router.get('/organizations/:id', apiLimiter, authenticateSuperAdmin, getOrganization);
router.put('/organizations/:id', apiLimiter, authenticateSuperAdmin, updateOrganization);
router.patch('/organizations/:id/status', apiLimiter, authenticateSuperAdmin, setOrganizationActive);
router.post('/organizations/:id/promote', apiLimiter, authenticateSuperAdmin, promoteOrganizationToProduction);
router.delete('/organizations/:id', apiLimiter, authenticateSuperAdmin, deleteOrganization);

// Stripe billing — protected
router.post('/billing/send-checkout/:orgId', apiLimiter, authenticateSuperAdmin, sendCheckoutLink);
router.post('/billing/portal/:orgId', apiLimiter, authenticateSuperAdmin, getPortalLink);

// Invites — verify/redeem are public (used by onboarding page before login)
router.get('/invites/verify/:token', apiLimiter, verifyInvite);
router.post('/invites/redeem/:token', authLimiter, redeemInvite);
// Invites management — protected
router.get('/invites', apiLimiter, authenticateSuperAdmin, listInvites);
router.post('/invites', apiLimiter, authenticateSuperAdmin, createInvite);
router.post('/invites/:id/resend', apiLimiter, authenticateSuperAdmin, resendInvite);
router.delete('/invites/:id', apiLimiter, authenticateSuperAdmin, deleteInvite);

export default router;
