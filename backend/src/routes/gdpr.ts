import { Router } from 'express';
import * as gdprController from '../controllers/gdprController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All GDPR routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/gdpr/export-data
 * @desc    Export all user data (GDPR compliance)
 * @access  Private
 */
router.get('/export-data', gdprController.exportUserData);

/**
 * @route   POST /api/gdpr/delete-account
 * @desc    Delete user account (Right to be Forgotten)
 * @access  Private
 */
router.post('/delete-account', gdprController.deleteUserAccount);

/**
 * @route   GET /api/gdpr/status
 * @desc    Get GDPR compliance status
 * @access  Private
 */
router.get('/status', gdprController.getGdprStatus);

export default router;
