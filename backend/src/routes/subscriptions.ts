import { Router } from 'express';
import * as subscriptionController from '../controllers/subscriptionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/subscriptions/plans
 * @desc    Get all available subscription plans
 * @access  Public
 */
router.get('/plans', subscriptionController.getPlans);

// All routes below require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/subscriptions/create
 * @desc    Create a new subscription
 * @access  Private
 */
router.post('/create', subscriptionController.createSubscription);

/**
 * @route   GET /api/subscriptions/active
 * @desc    Get active subscriptions for user
 * @access  Private
 */
router.get('/active', subscriptionController.getActiveSubscriptions);

/**
 * @route   GET /api/subscriptions/:id
 * @desc    Get single subscription
 * @access  Private
 */
router.get('/:id', subscriptionController.getSubscription);

/**
 * @route   PUT /api/subscriptions/:id/cancel
 * @desc    Cancel a subscription
 * @access  Private
 */
router.put('/:id/cancel', subscriptionController.cancelSubscription);

/**
 * @route   PUT /api/subscriptions/:id/update
 * @desc    Update subscription plan
 * @access  Private
 */
router.put('/:id/update', subscriptionController.updateSubscription);

/**
 * @route   PUT /api/subscriptions/:id/reactivate
 * @desc    Reactivate a canceled subscription
 * @access  Private
 */
router.put('/:id/reactivate', subscriptionController.reactivateSubscription);

export default router;
