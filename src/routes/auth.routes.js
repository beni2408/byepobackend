import { Router } from 'express';
import { signup, userSignup, login, me } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/signup', signup);           // org_admin signup
router.post('/user-signup', userSignup);  // end_user signup
router.post('/login', login);             // shared login (works for any role)
router.get('/me', authenticate, me);

export default router;
