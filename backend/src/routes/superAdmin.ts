import { Router } from 'express';
import { authenticateSuperAdmin } from '../middleware/superAdminAuth';
import {
  superAdminLogin,
  superAdminRefreshToken,
  getSuperAdminMe,
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  setOrganizationActive,
  deleteOrganization,
} from '../controllers/superAdminController';
import { createInvite, listInvites, verifyInvite, redeemInvite, deleteInvite } from '../controllers/inviteController';
import { sendCheckoutLink, getPortalLink } from '../controllers/stripeBillingController';

const router = Router();

// Auth — public
router.post('/auth/login', superAdminLogin);
router.post('/auth/refresh-token', superAdminRefreshToken);

// Auth — protected
router.get('/auth/me', authenticateSuperAdmin, getSuperAdminMe);

// Organizations — all protected
router.get('/organizations', authenticateSuperAdmin, listOrganizations);
router.post('/organizations', authenticateSuperAdmin, createOrganization);
router.get('/organizations/:id', authenticateSuperAdmin, getOrganization);
router.put('/organizations/:id', authenticateSuperAdmin, updateOrganization);
router.patch('/organizations/:id/status', authenticateSuperAdmin, setOrganizationActive);
router.delete('/organizations/:id', authenticateSuperAdmin, deleteOrganization);

// Stripe billing — protected
router.post('/billing/send-checkout/:orgId', authenticateSuperAdmin, sendCheckoutLink);
router.post('/billing/portal/:orgId', authenticateSuperAdmin, getPortalLink);

// Invites — verify/redeem are public (used by onboarding page before login)
router.get('/invites/verify/:token', verifyInvite);
router.post('/invites/redeem/:token', redeemInvite);
// Invites management — protected
router.get('/invites', authenticateSuperAdmin, listInvites);
router.post('/invites', authenticateSuperAdmin, createInvite);
router.delete('/invites/:id', authenticateSuperAdmin, deleteInvite);

export default router;
