import express from 'express';
import { 
  generateExamQuestions, 
  getAllSubjects, 
  getFallbackStatus, 
  validateQuestionFile,
  getPerformanceMetrics,
  resetPerformanceMetrics
} from '../controllers/questionController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/subjects', getAllSubjects);
router.post('/generate', authenticate, generateExamQuestions);

// Fallback system endpoints
router.get('/fallback/status', getFallbackStatus);
router.get('/fallback/validate', validateQuestionFile);

// Performance monitoring endpoints
router.get('/fallback/metrics', getPerformanceMetrics);
router.post('/fallback/metrics/reset', authenticate, resetPerformanceMetrics);

export default router;