import { Router } from 'express';
import { login, createOrganization, listOrganizations, updateOrganization, deleteOrganization } from '../controllers/superAdmin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

// Public — no token needed to log in
router.post('/login', login);

// Protected — must be a verified super_admin
router.post('/organizations', authenticate, requireRole('super_admin'), createOrganization);
router.get('/organizations', authenticate, requireRole('super_admin'), listOrganizations);
router.patch('/organizations/:id', authenticate, requireRole('super_admin'), updateOrganization);
router.delete('/organizations/:id', authenticate, requireRole('super_admin'), deleteOrganization);

export default router;
