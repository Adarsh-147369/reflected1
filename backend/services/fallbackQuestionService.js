import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import questionsConfig from '../config/questions.js';
import fallbackQuestionsLogger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fallback Question Service
 * Provides backup question generation when AI services fail
 */
class FallbackQuestionService {
  constructor(questionsBasePath = null) {
    // Use configuration module for path resolution if no explicit path provided
    if (questionsBasePath) {
      this.questionsBasePath = questionsBasePath;
    } else {
      // Will be set during initialization
      this.questionsBasePath = null;
    }
    
    // In-memory cache with TTL
    this.questionCache = new Map();
    this.CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    this.isInitialized = false;
  }

  /**
   * Initialize the fallback question service with configuration
   * @returns {Promise<Object>} Initialization result
   */
  async initialize() {
    const timer = fallbackQuestionsLogger.createTimer('service_initialization');
    
    try {
      if (!this.questionsBasePath) {
        // Initialize questions configuration
        const configResult = await questionsConfig.initialize();
        this.questionsBasePath = questionsConfig.getQuestionsPath();
        
        // Log configuration initialization
        fallbackQuestionsLogger.logConfiguration({
          questionsPath: this.questionsBasePath,
          isValid: configResult.isValid,
          environmentVariable: process.env.QUESTIONS_DIRECTORY_PATH,
          validationDetails: configResult,
          operation: 'initialization'
        });
        
        console.log(`📁 FallbackQuestionService initialized with configured path: ${this.questionsBasePath}`);
        
        if (!configResult.isValid) {
          console.warn(`⚠️ Questions directory validation warning: ${configResult.message}`);
          fallbackQuestionsLogger.logWarning({
            message: 'Questions directory validation warning during initialization',
            filePath: this.questionsBasePath,
            details: configResult
          });
        }
        
        this.isInitialized = true;
        timer.stop();
        return configResult;
      } else {
        // Custom path provided, validate it directly
        console.log(`📁 FallbackQuestionService initialized with custom path: ${this.questionsBasePath}`);
        
        const isValid = await this.validateQuestionsDirectory();
        
        // Log custom path configuration
        fallbackQuestionsLogger.logConfiguration({
          questionsPath: this.questionsBasePath,
          isValid,
          environmentVariable: null,
          validationDetails: { customPath: true },
          operation: 'custom_path_initialization'
        });
        
        this.isInitialized = true;
        timer.stop();
        
        return {
          success: true,
          questionsPath: this.questionsBasePath,
          isValid,
          message: isValid ? 'Custom path validated successfully' : 'Custom path validation failed'
        };
      }
    } catch (error) {
      timer.stop();
      
      fallbackQuestionsLogger.logError({
        message: 'FallbackQuestionService initialization failed',
        error,
        filePath: this.questionsBasePath,
        operation: 'initialization'
      });
      
      console.error(`❌ FallbackQuestionService initialization failed: ${error.message}`);
      this.isInitialized = true; // Mark as initialized even on failure
      
      return {
        success: false,
        questionsPath: this.questionsBasePath,
        isValid: false,
        message: `Initialization failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Load questions for a specific stream and subject with caching
   * @param {string} stream - Engineering stream (CSE, ECE, EEE, mech, civil)
   * @param {string} subject - Subject name
   * @returns {Promise<Object>} Questions object with mcq and descriptive arrays
   */
  async loadQuestions(stream, subject) {
    // Ensure service is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    const timer = fallbackQuestionsLogger.createTimer('question_loading');
    const cacheKey = `${stream}_${subject}`;
    
    // Check cache first
    const cached = this.questionCache.get(cacheKey);
    if (cached && (Date.now() - cached.loadedAt) < this.CACHE_TTL) {
      const loadTime = timer.stop();
      
      fallbackQuestionsLogger.logCacheOperation({
        operation: 'hit',
        cacheKey,
        hit: true,
        totalEntries: this.questionCache.size
      });
      
      console.log(`📋 Using cached questions for ${stream}/${subject}`);
      return cached.questions;
    } else if (cached) {
      // Cache entry exists but expired
      fallbackQuestionsLogger.logCacheOperation({
        operation: 'expired',
        cacheKey,
        expired: true,
        totalEntries: this.questionCache.size
      });
    } else {
      // Cache miss
      fallbackQuestionsLogger.logCacheOperation({
        operation: 'miss',
        cacheKey,
        miss: true,
        totalEntries: this.questionCache.size
      });
    }

    try {
      // Use configuration module to get file path if available
      let filePath;
      if (questionsConfig.isInitialized && questionsConfig.isQuestionsDirectoryValid()) {
        filePath = questionsConfig.getQuestionFilePath(stream);
      } else {
        // Fallback to direct path construction
        filePath = path.join(this.questionsBasePath, `${stream.toLowerCase()}_questions.json`);
      }
      
      console.log(`📁 Loading questions from: ${filePath}`);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        const loadTime = timer.stop();
        
        fallbackQuestionsLogger.logError({
          message: 'Questions file not found',
          error,
          stream,
          subject,
          filePath,
          operation: 'file_access'
        });
        
        throw new Error(`Questions file not found: ${filePath}. Please ensure the file exists and is accessible.`);
      }

      // Read and parse JSON file
      const fileContent = await fs.readFile(filePath, 'utf8');
      let questionsData;
      
      try {
        questionsData = JSON.parse(fileContent);
      } catch (parseError) {
        const loadTime = timer.stop();
        
        fallbackQuestionsLogger.logError({
          message: 'Invalid JSON format in questions file',
          error: parseError,
          stream,
          subject,
          filePath,
          operation: 'json_parsing'
        });
        
        throw new Error(`Invalid JSON format in file ${filePath}: ${parseError.message}`);
      }

      // Extract questions for the specific stream and subject
      const streamData = questionsData[stream.toUpperCase()];
      if (!streamData) {
        const loadTime = timer.stop();
        
        fallbackQuestionsLogger.logError({
          message: 'Stream not found in questions file',
          error: new Error(`Stream '${stream}' not found`),
          stream,
          subject,
          filePath,
          operation: 'stream_extraction'
        });
        
        throw new Error(`Stream '${stream}' not found in questions file ${filePath}`);
      }

      const subjectQuestions = streamData[subject];
      if (!subjectQuestions || !Array.isArray(subjectQuestions)) {
        const loadTime = timer.stop();
        
        fallbackQuestionsLogger.logError({
          message: 'Subject not found or invalid in questions file',
          error: new Error(`Subject '${subject}' not found or invalid`),
          stream,
          subject,
          filePath,
          operation: 'subject_extraction'
        });
        
        throw new Error(`Subject '${subject}' not found or invalid in stream '${stream}' in file ${filePath}`);
      }

      // Separate MCQ and descriptive questions
      const mcqQuestions = subjectQuestions.filter(q => q.type === 'MCQ');
      const descriptiveQuestions = subjectQuestions.filter(q => q.type === 'Descriptive');

      const questions = {
        mcq: mcqQuestions,
        descriptive: descriptiveQuestions
      };

      // Validate question structure
      try {
        this.validateQuestionStructure(questions);
      } catch (validationError) {
        const loadTime = timer.stop();
        
        fallbackQuestionsLogger.logError({
          message: 'Question structure validation failed',
          error: validationError,
          stream,
          subject,
          filePath,
          validationDetails: {
            mcqCount: mcqQuestions.length,
            descriptiveCount: descriptiveQuestions.length
          },
          operation: 'validation'
        });
        
        throw validationError;
      }

      // Cache the loaded questions
      this.questionCache.set(cacheKey, {
        questions,
        loadedAt: Date.now(),
        ttl: this.CACHE_TTL
      });

      const loadTime = timer.stop();

      // Log successful loading with performance metrics
      fallbackQuestionsLogger.logQuestionLoadingPerformance({
        stream,
        subject,
        loadTimeMs: loadTime,
        cacheHit: false,
        totalQuestions: mcqQuestions.length + descriptiveQuestions.length,
        mcqCount: mcqQuestions.length,
        descriptiveCount: descriptiveQuestions.length,
        filePath
      });

      console.log(`✅ Successfully loaded ${mcqQuestions.length} MCQ and ${descriptiveQuestions.length} descriptive questions for ${stream}/${subject}`);
      
      return questions;

    } catch (error) {
      const loadTime = timer.stop();
      
      // Log error if not already logged above
      if (!error.message.includes('Questions file not found') && 
          !error.message.includes('Invalid JSON format') &&
          !error.message.includes('Stream') &&
          !error.message.includes('Subject')) {
        fallbackQuestionsLogger.logError({
          message: 'Unexpected error loading questions',
          error,
          stream,
          subject,
          operation: 'question_loading'
        });
      }
      
      console.error(`❌ Error loading questions for ${stream}/${subject}:`, error.message);
      throw error;
    }
  }

  /**
   * Validate question file structure
   * @param {Object} questions - Questions object with mcq and descriptive arrays
   * @throws {Error} If validation fails
   */
  validateQuestionStructure(questions) {
    if (!questions.mcq || !Array.isArray(questions.mcq)) {
      throw new Error('Invalid questions format: missing or invalid mcq array');
    }

    if (!questions.descriptive || !Array.isArray(questions.descriptive)) {
      throw new Error('Invalid questions format: missing or invalid descriptive array');
    }

    // Validate MCQ questions structure
    questions.mcq.forEach((question, index) => {
      if (!question.question || typeof question.question !== 'string') {
        throw new Error(`MCQ question ${index + 1}: missing or invalid question text`);
      }
      if (!question.options || !Array.isArray(question.options) || question.options.length !== 4) {
        throw new Error(`MCQ question ${index + 1}: must have exactly 4 options`);
      }
      if (!question.answer || typeof question.answer !== 'string') {
        throw new Error(`MCQ question ${index + 1}: missing or invalid answer`);
      }
      if (!question.options.includes(question.answer)) {
        throw new Error(`MCQ question ${index + 1}: answer must be one of the provided options`);
      }
    });

    // Validate descriptive questions structure
    questions.descriptive.forEach((question, index) => {
      if (!question.question || typeof question.question !== 'string') {
        throw new Error(`Descriptive question ${index + 1}: missing or invalid question text`);
      }
      if (!question.answer || typeof question.answer !== 'string') {
        throw new Error(`Descriptive question ${index + 1}: missing or invalid answer content`);
      }
    });
  }

  /**
   * Check if questions directory exists and is accessible
   * @returns {Promise<boolean>} True if directory is accessible
   */
  async validateQuestionsDirectory() {
    // Use configuration module validation if available and initialized
    if (questionsConfig.isInitialized) {
      return questionsConfig.isQuestionsDirectoryValid();
    }

    // Fallback to direct validation if path is available
    if (!this.questionsBasePath) {
      console.error(`❌ Questions directory validation failed: No path configured`);
      return false;
    }

    try {
      await fs.access(this.questionsBasePath);
      const stats = await fs.stat(this.questionsBasePath);
      return stats.isDirectory();
    } catch (error) {
      console.error(`❌ Questions directory validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, value] of this.questionCache.entries()) {
      if ((now - value.loadedAt) < this.CACHE_TTL) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.questionCache.size,
      validEntries,
      expiredEntries,
      cacheTTL: this.CACHE_TTL
    };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.questionCache.entries()) {
      if ((now - value.loadedAt) >= this.CACHE_TTL) {
        this.questionCache.delete(key);
      }
    }
  }

  /**
   * Get 10 random questions (8 MCQ + 2 descriptive) from loaded questions
   * @param {string} stream - Engineering stream
   * @param {string} subject - Subject name
   * @returns {Promise<Object>} Selected questions with metadata
   */
  async getRandomQuestions(stream, subject) {
    const timer = fallbackQuestionsLogger.createTimer('question_selection');
    
    try {
      // Load questions first
      const questions = await this.loadQuestions(stream, subject);
      
      // Validate minimum question count requirements
      if (questions.mcq.length < 8) {
        const selectionTime = timer.stop();
        
        fallbackQuestionsLogger.logError({
          message: 'Insufficient MCQ questions available for selection',
          error: new Error(`Required: 8, Available: ${questions.mcq.length}`),
          stream,
          subject,
          validationDetails: {
            required: 8,
            available: questions.mcq.length,
            type: 'MCQ'
          },
          operation: 'question_count_validation'
        });
        
        throw new Error(`Insufficient MCQ questions available. Required: 8, Available: ${questions.mcq.length}`);
      }
      
      if (questions.descriptive.length < 2) {
        const selectionTime = timer.stop();
        
        fallbackQuestionsLogger.logError({
          message: 'Insufficient descriptive questions available for selection',
          error: new Error(`Required: 2, Available: ${questions.descriptive.length}`),
          stream,
          subject,
          validationDetails: {
            required: 2,
            available: questions.descriptive.length,
            type: 'Descriptive'
          },
          operation: 'question_count_validation'
        });
        
        throw new Error(`Insufficient descriptive questions available. Required: 2, Available: ${questions.descriptive.length}`);
      }

      // Randomly select 8 MCQ questions
      const selectedMCQ = this._getRandomItems(questions.mcq, 8);
      
      // Randomly select 2 descriptive questions
      const selectedDescriptive = this._getRandomItems(questions.descriptive, 2);

      const selectionTime = timer.stop();

      const result = {
        questions: [...selectedMCQ, ...selectedDescriptive],
        source: 'fallback',
        metadata: {
          stream,
          subject,
          totalAvailable: questions.mcq.length + questions.descriptive.length,
          selectedCount: 10,
          mcqCount: selectedMCQ.length,
          descriptiveCount: selectedDescriptive.length,
          selectionTimestamp: new Date().toISOString()
        }
      };

      // Log successful question selection
      fallbackQuestionsLogger.logQuestionSelection({
        stream,
        subject,
        selectionTimeMs: selectionTime,
        totalAvailable: questions.mcq.length + questions.descriptive.length,
        selectedCount: 10,
        mcqSelected: selectedMCQ.length,
        descriptiveSelected: selectedDescriptive.length
      });

      console.log(`✅ Successfully selected ${selectedMCQ.length} MCQ and ${selectedDescriptive.length} descriptive questions for ${stream}/${subject}`);
      
      return result;

    } catch (error) {
      const selectionTime = timer.stop();
      
      // Log error if not already logged above
      if (!error.message.includes('Insufficient')) {
        fallbackQuestionsLogger.logError({
          message: 'Unexpected error during question selection',
          error,
          stream,
          subject,
          operation: 'question_selection'
        });
      }
      
      console.error(`❌ Error selecting random questions for ${stream}/${subject}:`, error.message);
      throw error;
    }
  }

  /**
   * Get random items from array without duplicates
   * Uses Fisher-Yates shuffle algorithm for better randomness
   * @param {Array} array - Source array
   * @param {number} count - Number of items to select
   * @returns {Array} Randomly selected items
   * @private
   */
  _getRandomItems(array, count) {
    if (count >= array.length) {
      // If we need all or more items than available, return shuffled copy of entire array
      return this._shuffleArray([...array]);
    }

    // Create a copy of the array to avoid modifying original
    const arrayCopy = [...array];
    const selected = [];

    // Use Fisher-Yates shuffle to select random items
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * (arrayCopy.length - i));
      
      // Swap the selected item to the end of the unselected portion
      [arrayCopy[randomIndex], arrayCopy[arrayCopy.length - 1 - i]] = 
      [arrayCopy[arrayCopy.length - 1 - i], arrayCopy[randomIndex]];
      
      // Add the selected item to our result
      selected.push(arrayCopy[arrayCopy.length - 1 - i]);
    }

    return selected;
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   * @private
   */
  _shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// Export singleton instance and legacy functions for backward compatibility
const fallbackQuestionService = new FallbackQuestionService();

/**
 * Legacy function - Load questions from JSON file as fallback when AI generation fails
 * @param {string} subjectName - Name of the subject
 * @param {string} stream - Stream (CSE, ECE, EEE, mech, civil)
 * @returns {Object} Questions object with mcq and descriptive arrays
 * @deprecated Use FallbackQuestionService class instead
 */
export const loadFallbackQuestions = async (subjectName, stream) => {
  try {
    const result = await fallbackQuestionService.getRandomQuestions(stream, subjectName);
    
    // Transform MCQ questions to match AI format
    const mcq = result.questions
      .filter(q => q.type === 'MCQ')
      .map(q => ({
        question: q.question,
        options: Array.isArray(q.options) 
          ? { A: q.options[0], B: q.options[1], C: q.options[2], D: q.options[3] }
          : q.options,
        correct_answer: q.answer || q.correct_answer,
        explanation: q.explanation
      }));
    
    // Transform descriptive questions to match AI format
    const descriptive = result.questions
      .filter(q => q.type === 'Descriptive')
      .map(q => ({
        question: q.question,
        model_answer: q.answer || q.model_answer,
        explanation: q.explanation
      }));
    
    return { mcq, descriptive };
  } catch (error) {
    console.error('❌ Error in legacy loadFallbackQuestions:', error.message);
    throw error;
  }
};

/**
 * Check if fallback questions exist for a subject
 * @param {string} subjectName - Name of the subject
 * @param {string} stream - Stream (CSE, ECE, EEE, mech, civil)
 * @returns {Promise<boolean>} True if fallback questions exist
 */
export const hasFallbackQuestions = async (subjectName, stream) => {
  try {
    await fallbackQuestionService.loadQuestions(stream, subjectName);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * List all available fallback question files
 * @returns {Promise<Object>} Object with streams as keys and arrays of subject names as values
 */
export const listAvailableFallbackQuestions = async () => {
  try {
    const questionsBaseDir = fallbackQuestionService.questionsBasePath;
    const result = {};

    if (!fsSync.existsSync(questionsBaseDir)) {
      return result;
    }

    const files = await fs.readdir(questionsBaseDir);
    const questionFiles = files.filter(file => file.endsWith('_questions.json'));

    for (const file of questionFiles) {
      const stream = file.replace('_questions.json', '').toUpperCase();
      const filePath = path.join(questionsBaseDir, file);
      
      try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const questionsData = JSON.parse(fileContent);
        
        if (questionsData[stream]) {
          result[stream] = Object.keys(questionsData[stream]);
        }
      } catch (error) {
        console.error(`Error reading ${file}:`, error.message);
      }
    }

    return result;
  } catch (error) {
    console.error('Error listing fallback questions:', error);
    return {};
  }
};

// Export the service class and singleton instance
export { FallbackQuestionService };
export default fallbackQuestionService;