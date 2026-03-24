import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { createProgram, getPrograms, getProgram, updateProgram } from '../controllers/programController';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'staff'));

router.get('/', getPrograms);
router.post('/', requireRole('admin'), createProgram);
router.get('/:id', getProgram);
router.put('/:id', requireRole('admin'), updateProgram);

export default router;
