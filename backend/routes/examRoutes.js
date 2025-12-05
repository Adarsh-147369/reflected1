import express from 'express';
import { startExam, submitExam, getExamHistory, getEvaluationDetails } from '../controllers/examController.js';
import { authenticate, isStudent } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/start', authenticate, isStudent, startExam);
router.post('/submit', authenticate, isStudent, submitExam);
router.get('/history', authenticate, isStudent, getExamHistory);
router.get('/evaluation/:examId', authenticate, isStudent, getEvaluationDetails);

export default router;