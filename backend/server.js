import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/database.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import examRoutes from './routes/examRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import pdfQuestionRoutes from './routes/pdfQuestionRoutes.js';

// Middleware imports
import { errorHandler } from './middleware/errorHandler.js';

// Service imports
import fallbackQuestionService from './services/fallbackQuestionService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected successfully at:', res.rows[0].now);
  }
});

// Initialize fallback question service
(async () => {
  try {
    console.log('🔄 Initializing fallback question service...');
    const initResult = await fallbackQuestionService.initialize();
    
    if (initResult.success && initResult.isValid) {
      console.log('✅ Fallback question service initialized successfully');
      console.log(`📁 Questions directory: ${initResult.questionsPath}`);
    } else if (initResult.success && !initResult.isValid) {
      console.warn('⚠️ Fallback question service initialized with warnings');
      console.warn(`📁 Questions directory: ${initResult.questionsPath}`);
      console.warn(`⚠️ Warning: ${initResult.message}`);
    } else {
      console.error('❌ Fallback question service initialization failed');
      console.error(`📁 Expected questions directory: ${initResult.questionsPath}`);
      console.error(`❌ Error: ${initResult.message}`);
    }
  } catch (error) {
    console.error('❌ Failed to initialize fallback question service:', error.message);
  }
})();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pdf-questions', pdfQuestionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Root route - helpful message
app.get('/', (req, res) => {
  res.json({
    message: 'Adaptive Learning Platform API Server',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      exams: '/api/exams',
      questions: '/api/questions',
      resources: '/api/resources',
      progress: '/api/progress',
      admin: '/api/admin'
    },
    note: 'Frontend application should run on http://localhost:3000'
  });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});