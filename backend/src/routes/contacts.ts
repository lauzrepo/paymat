import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  createContact,
  getContacts,
  getContact,
  updateContact,
  deactivateContact,
} from '../controllers/contactController';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'staff'));

router.get('/', getContacts);
router.post('/', requireRole('admin', 'staff'), createContact);
router.get('/:id', getContact);
router.put('/:id', requireRole('admin', 'staff'), updateContact);
router.delete('/:id', requireRole('admin'), deactivateContact);

export default router;
