import { Router } from 'express';
import { createFlag, listFlags, updateFlag, deleteFlag } from '../controllers/flag.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

// All flag routes require a valid org_admin token
router.use(authenticate, requireRole('org_admin'));

router.post('/', createFlag);
router.get('/', listFlags);
router.patch('/:id', updateFlag);
router.delete('/:id', deleteFlag);

export default router;
