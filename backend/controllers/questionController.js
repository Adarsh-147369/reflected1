import { generateQuestionsWithAI } from '../services/aiQuestionGenerator.js';
import fallbackQuestionService, { listAvailableFallbackQuestions } from '../services/fallbackQuestionService.js';
import { pool } from '../config/database.js';
import fallbackQuestionsLogger from '../utils/logger.js';

export const getAllSubjects = async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT * FROM subjects ORDER BY stream, name'
    );

    res.json({ subjects: result.rows });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  } finally {
    client.release();
  }
};

export const generateExamQuestions = async (req, res) => {
  const client = await pool.connect();

  try {
    const { subject_id } = req.body;

    // Get subject details
    const subjectResult = await client.query(
      'SELECT * FROM subjects WHERE id = $1',
      [subject_id]
    );

    if (subjectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const subject = subjectResult.rows[0];

    try {
      // Try AI generation first
      console.log(`🤖 Attempting AI question generation for ${subject.name} (${subject.stream})`);
      const aiQuestions = await generateQuestionsWithAI(subject.name, subject.stream);
      
      console.log(`✅ AI generation successful for ${subject.name}`);
      res.json({
        message: 'Questions generated successfully',
        questions: aiQuestions,
        source: 'ai'
      });

    } catch (aiError) {
      console.warn(`⚠️ AI generation failed for ${subject.name} (${subject.stream}):`, aiError.message);
      console.log(`🔄 Attempting fallback question generation...`);

      const fallbackTimer = Date.now();

      try {
        // Fallback to pre-defined questions
        const fallbackResult = await fallbackQuestionService.getRandomQuestions(subject.stream, subject.name);
        
        const fallbackLoadTime = Date.now() - fallbackTimer;

        // Log fallback activation
        fallbackQuestionsLogger.logFallbackActivation({
          stream: subject.stream,
          subject: subject.name,
          aiError: aiError.message,
          questionsSelected: fallbackResult.metadata.selectedCount,
          loadTime: fallbackLoadTime,
          source: 'fallback'
        });
        
        console.log(`✅ Fallback generation successful for ${subject.name}`);
        res.json({
          message: 'Questions generated successfully using fallback',
          questions: {
            mcq: fallbackResult.questions.filter(q => q.type === 'MCQ'),
            descriptive: fallbackResult.questions.filter(q => q.type === 'Descriptive')
          },
          source: 'fallback',
          metadata: fallbackResult.metadata,
          aiError: aiError.message
        });

      } catch (fallbackError) {
        const fallbackLoadTime = Date.now() - fallbackTimer;

        // Log fallback failure
        fallbackQuestionsLogger.logError({
          message: 'Both AI and fallback question generation failed',
          error: fallbackError,
          stream: subject.stream,
          subject: subject.name,
          validationDetails: {
            aiError: aiError.message,
            fallbackError: fallbackError.message,
            fallbackLoadTime
          },
          operation: 'fallback_generation'
        });

        console.error(`❌ Both AI and fallback failed for ${subject.name}:`, {
          aiError: aiError.message,
          fallbackError: fallbackError.message
        });
        
        res.status(500).json({
          error: 'Question generation failed',
          message: 'Both AI and fallback question generation failed',
          details: {
            aiError: aiError.message,
            fallbackError: fallbackError.message
          }
        });
      }
    }

  } catch (error) {
    console.error('Question generation controller error:', error);
    res.status(500).json({ error: 'Failed to generate questions' });
  } finally {
    client.release();
  }
};
/**
 * Get
 fallback system status and health check
 */
export const getFallbackStatus = async (req, res) => {
  try {
    console.log('🔍 Checking fallback system status...');

    // Check if questions directory is accessible
    const directoryAccessible = await fallbackQuestionService.validateQuestionsDirectory();
    
    // Get cache statistics
    const cacheStats = fallbackQuestionService.getCacheStats();
    
    // List available fallback questions
    const availableQuestions = await listAvailableFallbackQuestions();
    
    // Count total subjects available
    let totalSubjects = 0;
    const streamCounts = {};
    
    for (const [stream, subjects] of Object.entries(availableQuestions)) {
      streamCounts[stream] = subjects.length;
      totalSubjects += subjects.length;
    }

    const status = {
      status: directoryAccessible ? 'healthy' : 'unhealthy',
      questionsDirectory: {
        accessible: directoryAccessible,
        path: fallbackQuestionService.questionsBasePath
      },
      cache: cacheStats,
      availableQuestions: {
        totalStreams: Object.keys(availableQuestions).length,
        totalSubjects,
        streamCounts,
        details: availableQuestions
      },
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Fallback status check completed: ${status.status}`);
    
    res.json(status);

  } catch (error) {
    console.error('❌ Error checking fallback status:', error);
    res.status(500).json({
      error: 'Failed to check fallback status',
      message: error.message,
      status: 'error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Validate question file structure for a specific stream and subject
 */
export const validateQuestionFile = async (req, res) => {
  try {
    const { stream, subject } = req.query;

    if (!stream || !subject) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Both stream and subject parameters are required'
      });
    }

    console.log(`🔍 Validating question file for ${stream}/${subject}...`);

    // Attempt to load and validate questions
    const questions = await fallbackQuestionService.loadQuestions(stream, subject);
    
    // Additional validation checks
    const validation = {
      valid: true,
      stream,
      subject,
      mcqCount: questions.mcq.length,
      descriptiveCount: questions.descriptive.length,
      totalQuestions: questions.mcq.length + questions.descriptive.length,
      meetsMinimumRequirements: {
        mcq: questions.mcq.length >= 8,
        descriptive: questions.descriptive.length >= 2,
        overall: questions.mcq.length >= 8 && questions.descriptive.length >= 2
      },
      sampleQuestions: {
        mcq: questions.mcq.slice(0, 2).map(q => ({
          question: q.question.substring(0, 100) + '...',
          hasOptions: Array.isArray(q.options) && q.options.length === 4,
          hasAnswer: !!q.answer
        })),
        descriptive: questions.descriptive.slice(0, 1).map(q => ({
          question: q.question.substring(0, 100) + '...',
          hasAnswer: !!q.answer
        }))
      },
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Question file validation completed for ${stream}/${subject}`);
    
    res.json(validation);

  } catch (error) {
    console.error(`❌ Question file validation failed for ${req.query.stream}/${req.query.subject}:`, error);
    
    res.status(400).json({
      valid: false,
      error: 'Question file validation failed',
      message: error.message,
      stream: req.query.stream,
      subject: req.query.subject,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get performance metrics for fallback question service
 */
export const getPerformanceMetrics = async (req, res) => {
  try {
    console.log('📊 Retrieving performance metrics...');

    // Import metrics collector
    const { default: metricsCollector } = await import('../utils/metricsCollector.js');
    
    const { category, detailed, trends } = req.query;
    const trendHours = parseInt(req.query.hours) || 24;

    let response = {};

    if (category && detailed === 'true') {
      // Get detailed metrics for specific category
      response = metricsCollector.getDetailedMetrics(category);
    } else if (trends === 'true') {
      // Get performance trends
      response = metricsCollector.getPerformanceTrends(trendHours);
    } else {
      // Get summary metrics
      response = metricsCollector.getMetricsSummary();
    }

    console.log('✅ Performance metrics retrieved successfully');
    res.json(response);

  } catch (error) {
    console.error('❌ Error retrieving performance metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve performance metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Reset performance metrics
 */
export const resetPerformanceMetrics = async (req, res) => {
  try {
    console.log('🔄 Resetting performance metrics...');

    // Import metrics collector
    const { default: metricsCollector } = await import('../utils/metricsCollector.js');
    
    metricsCollector.resetMetrics();

    console.log('✅ Performance metrics reset successfully');
    res.json({
      message: 'Performance metrics reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error resetting performance metrics:', error);
    res.status(500).json({
      error: 'Failed to reset performance metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};