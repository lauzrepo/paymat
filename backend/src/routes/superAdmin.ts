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

export default router;
