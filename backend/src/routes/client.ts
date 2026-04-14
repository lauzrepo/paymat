import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getMe,
  getMyEnrollments,
  getMyInvoices,
  getMyInvoice,
  initializeInvoicePayment,
  confirmInvoicePayment,
  getMyPayments,
} from '../controllers/clientController';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('client', 'admin', 'staff')); // admins can test client views

router.get('/me', getMe);
router.get('/enrollments', getMyEnrollments);
router.get('/invoices', getMyInvoices);
router.get('/invoices/:id', getMyInvoice);
router.post('/invoices/:id/initialize-payment', initializeInvoicePayment);
router.post('/invoices/:id/confirm-payment', confirmInvoicePayment);
router.get('/payments', getMyPayments);

export default router;
