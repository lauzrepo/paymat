import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { chatWithAssistant } from '../controllers/assistantController';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('admin', 'staff'));

router.post('/chat', chatWithAssistant);

export default router;
