import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  createContact,
  getContacts,
  getContact,
  updateContact,
  deactivateContact,
  reactivateContact,
  deleteContact,
} from '../controllers/contactController';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'staff'));

router.get('/', getContacts);
router.post('/', requireRole('admin', 'staff'), createContact);
router.get('/:id', getContact);
router.put('/:id', requireRole('admin', 'staff'), updateContact);
router.post('/:id/reactivate', requireRole('admin', 'staff'), reactivateContact);
router.delete('/:id/permanent', requireRole('admin'), deleteContact);
router.delete('/:id', requireRole('admin'), deactivateContact);

export default router;
