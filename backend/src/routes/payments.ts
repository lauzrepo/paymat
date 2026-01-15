import { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { validate, paymentSchema } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { paymentLimiter } from '../middleware/rateLimiter';

const router = Router();

// All payment routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/payments/create
 * @desc    Create and process a payment
 * @access  Private
 */
router.post('/create', paymentLimiter, validate(paymentSchema), paymentController.createPayment);

/**
 * @route   GET /api/payments/history
 * @desc    Get payment history
 * @access  Private
 */
router.get('/history', paymentController.getPaymentHistory);

/**
 * @route   GET /api/payments/stats
 * @desc    Get payment statistics
 * @access  Private
 */
router.get('/stats', paymentController.getPaymentStats);

/**
 * @route   GET /api/payments/:id
 * @desc    Get single payment
 * @access  Private
 */
router.get('/:id', paymentController.getPayment);

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Refund a payment
 * @access  Private
 */
router.post('/:id/refund', paymentController.refundPayment);

export default router;
