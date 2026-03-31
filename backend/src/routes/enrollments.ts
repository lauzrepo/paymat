import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  enroll,
  getEnrollments,
  getEnrollment,
  unenroll,
  deleteEnrollment,
  pauseEnrollment,
  resumeEnrollment,
} from '../controllers/enrollmentController';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'staff'));

router.get('/', getEnrollments);
router.post('/', enroll);
router.get('/:id', getEnrollment);
router.delete('/:id', unenroll);
router.delete('/:id/force', deleteEnrollment);
router.post('/:id/pause', pauseEnrollment);
router.post('/:id/resume', resumeEnrollment);

export default router;
