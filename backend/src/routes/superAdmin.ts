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
} from '../controllers/superAdminController';
import { createInvite, listInvites, verifyInvite, redeemInvite } from '../controllers/inviteController';

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

// Invites — verify/redeem are public (used by onboarding page before login)
router.get('/invites/verify/:token', verifyInvite);
router.post('/invites/redeem/:token', redeemInvite);
// Invites management — protected
router.get('/invites', authenticateSuperAdmin, listInvites);
router.post('/invites', authenticateSuperAdmin, createInvite);

export default router;
