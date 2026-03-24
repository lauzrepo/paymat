import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  createInvoice,
  getInvoices,
  getInvoice,
  markInvoicePaid,
  voidInvoice,
  getInvoiceStats,
} from '../controllers/invoiceController';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'staff'));

router.get('/stats', getInvoiceStats);
router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.post('/:id/mark-paid', requireRole('admin'), markInvoicePaid);
router.post('/:id/void', requireRole('admin'), voidInvoice);

export default router;
