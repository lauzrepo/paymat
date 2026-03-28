import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  createFeedback,
  getFeedback,
  getFeedbackById,
  updateFeedbackStatus,
} from '../controllers/feedbackController';

const router = Router();

// Submit feedback — any authenticated user (admin, staff, or client)
router.post('/', authenticateToken, createFeedback);

// Manage feedback — admin and staff only
router.get('/', authenticateToken, requireRole('admin', 'staff'), getFeedback);
router.get('/:id', authenticateToken, requireRole('admin', 'staff'), getFeedbackById);
router.patch('/:id/status', authenticateToken, requireRole('admin', 'staff'), updateFeedbackStatus);

export default router;
