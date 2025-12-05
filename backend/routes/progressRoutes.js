import express from 'express';
import { getImprovementData, getUserProgress } from '../controllers/progressController.js';
import { authenticate, isStudent } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/improvement', authenticate, isStudent, getImprovementData);
router.get('/user', authenticate, isStudent, getUserProgress);

export default router;