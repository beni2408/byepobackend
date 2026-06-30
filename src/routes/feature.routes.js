import { Router } from 'express';
import { checkFeature } from '../controllers/feature.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.post('/check', authenticate, requireRole('end_user'), checkFeature);

export default router;
