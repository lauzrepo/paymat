import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { createFamily, getFamilies, getFamily, updateFamily, deleteFamily, initializeFamilyCardCheckout, saveFamilyCardToken } from '../controllers/familyController';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'staff'));

router.get('/', getFamilies);
router.post('/', createFamily);
router.get('/:id', getFamily);
router.put('/:id', updateFamily);
router.delete('/:id', requireRole('admin'), deleteFamily);
router.post('/:id/card/initialize', initializeFamilyCardCheckout);
router.post('/:id/card/token', saveFamilyCardToken);

export default router;
