import express from 'express';
import { getResourcesForUser, updateResourceProgress } from '../controllers/resourceController.js';
import { authenticate, isStudent } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/subject/:subject_id', authenticate, isStudent, getResourcesForUser);
router.put('/progress/:resource_id', authenticate, isStudent, updateResourceProgress);

export default router;