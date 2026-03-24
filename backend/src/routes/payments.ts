import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { processPayment, getPayments, getPayment, refundPayment, getPaymentStats } from '../controllers/paymentController';
import { paymentLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'staff', 'client'));

router.get('/stats', requireRole('admin', 'staff'), getPaymentStats);
router.get('/', requireRole('admin', 'staff'), getPayments);
router.post('/', paymentLimiter, processPayment);
router.get('/:id', getPayment);
router.post('/:id/refund', requireRole('admin'), refundPayment);

export default router;
