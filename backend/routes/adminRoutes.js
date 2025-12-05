import express from 'express';
import { 
  getAllUsers, 
  getOverallImprovement, 
  getSubjectStatistics, 
  addLearningResource,
  getStudentProgress,
  deleteStudent,
  deleteExam
} from '../controllers/adminController.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/users', authenticate, isAdmin, getAllUsers);
router.get('/improvement', authenticate, isAdmin, getOverallImprovement);
router.get('/statistics', authenticate, isAdmin, getSubjectStatistics);
router.post('/resources', authenticate, isAdmin, addLearningResource);
router.get('/students/:userId/progress', authenticate, isAdmin, getStudentProgress);
router.delete('/students/:userId', authenticate, isAdmin, deleteStudent);
router.delete('/exams/:examId', authenticate, isAdmin, deleteExam);

export default router;