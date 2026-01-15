import { Router } from 'express';
import * as paymentMethodController from '../controllers/paymentMethodController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All payment method routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/payment-methods/attach
 * @desc    Save a payment method
 * @access  Private
 */
router.post('/attach', paymentMethodController.savePaymentMethod);

/**
 * @route   GET /api/payment-methods
 * @desc    Get all payment methods for user
 * @access  Private
 */
router.get('/', paymentMethodController.getPaymentMethods);

/**
 * @route   DELETE /api/payment-methods/:id
 * @desc    Delete a payment method
 * @access  Private
 */
router.delete('/:id', paymentMethodController.deletePaymentMethod);

/**
 * @route   PUT /api/payment-methods/:id/default
 * @desc    Set payment method as default
 * @access  Private
 */
router.put('/:id/default', paymentMethodController.setDefaultPaymentMethod);

export default router;
