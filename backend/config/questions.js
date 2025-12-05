import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Questions Configuration Module
 * Manages configuration for fallback questions directory and path resolution
 */
class QuestionsConfig {
  constructor() {
    this.questionsPath = null;
    this.isInitialized = false;
    this.validationResult = null;
  }

  /**
   * Initialize questions configuration
   * Resolves questions directory path from environment variables or defaults
   */
  async initialize() {
    try {
      // Get questions directory path from environment variable or use default
      const envQuestionsPath = process.env.QUESTIONS_DIRECTORY_PATH;
      
      if (envQuestionsPath) {
        // Support both relative and absolute paths
        if (path.isAbsolute(envQuestionsPath)) {
          this.questionsPath = envQuestionsPath;
        } else {
          // Resolve relative path from project root (two levels up from backend/config)
          this.questionsPath = path.resolve(__dirname, '../../', envQuestionsPath);
        }
      } else {
        // Default: questions directory at project root
        this.questionsPath = path.resolve(__dirname, '../../questions');
      }

      // Validate questions directory existence
      this.validationResult = await this.validateQuestionsDirectory();
      this.isInitialized = true;

      return {
        success: true,
        questionsPath: this.questionsPath,
        isValid: this.validationResult.isValid,
        message: this.validationResult.message
      };

    } catch (error) {
      this.isInitialized = true;
      this.validationResult = {
        isValid: false,
        message: `Configuration initialization failed: ${error.message}`,
        error: error
      };

      return {
        success: false,
        questionsPath: this.questionsPath,
        isValid: false,
        message: this.validationResult.message,
        error: error.message
      };
    }
  }

  /**
   * Validate questions directory existence and accessibility
   * @returns {Promise<Object>} Validation result with details
   */
  async validateQuestionsDirectory() {
    if (!this.questionsPath) {
      return {
        isValid: false,
        message: 'Questions path not configured',
        details: null
      };
    }

    try {
      // Check if directory exists
      const stats = await fs.stat(this.questionsPath);
      
      if (!stats.isDirectory()) {
        return {
          isValid: false,
          message: `Questions path exists but is not a directory: ${this.questionsPath}`,
          details: { path: this.questionsPath, type: 'file' }
        };
      }

      // Check if directory is readable
      await fs.access(this.questionsPath, fs.constants.R_OK);

      // Check for question files
      const files = await fs.readdir(this.questionsPath);
      const questionFiles = files.filter(file => file.endsWith('_questions.json'));

      if (questionFiles.length === 0) {
        return {
          isValid: false,
          message: `Questions directory exists but contains no question files: ${this.questionsPath}`,
          details: { 
            path: this.questionsPath, 
            totalFiles: files.length,
            questionFiles: 0,
            availableFiles: files
          }
        };
      }

      return {
        isValid: true,
        message: `Questions directory validated successfully: ${this.questionsPath}`,
        details: {
          path: this.questionsPath,
          totalFiles: files.length,
          questionFiles: questionFiles.length,
          availableQuestionFiles: questionFiles
        }
      };

    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          isValid: false,
          message: `Questions directory does not exist: ${this.questionsPath}`,
          details: { path: this.questionsPath, error: 'Directory not found' }
        };
      }

      if (error.code === 'EACCES') {
        return {
          isValid: false,
          message: `Questions directory is not accessible (permission denied): ${this.questionsPath}`,
          details: { path: this.questionsPath, error: 'Permission denied' }
        };
      }

      return {
        isValid: false,
        message: `Questions directory validation failed: ${error.message}`,
        details: { path: this.questionsPath, error: error.message }
      };
    }
  }

  /**
   * Get the configured questions directory path
   * @returns {string} Questions directory path
   */
  getQuestionsPath() {
    if (!this.isInitialized) {
      throw new Error('QuestionsConfig not initialized. Call initialize() first.');
    }
    return this.questionsPath;
  }

  /**
   * Check if questions directory is valid
   * @returns {boolean} True if directory is valid and accessible
   */
  isQuestionsDirectoryValid() {
    if (!this.isInitialized || !this.validationResult) {
      return false;
    }
    return this.validationResult.isValid;
  }

  /**
   * Get validation details
   * @returns {Object} Validation result details
   */
  getValidationDetails() {
    if (!this.isInitialized || !this.validationResult) {
      return null;
    }
    return this.validationResult;
  }

  /**
   * Get configuration summary
   * @returns {Object} Configuration summary
   */
  getConfigSummary() {
    return {
      isInitialized: this.isInitialized,
      questionsPath: this.questionsPath,
      isValid: this.isQuestionsDirectoryValid(),
      environmentVariable: process.env.QUESTIONS_DIRECTORY_PATH || null,
      validationDetails: this.getValidationDetails()
    };
  }

  /**
   * Resolve a question file path for a specific stream
   * @param {string} stream - Engineering stream (cse, ece, eee, mech, civil)
   * @returns {string} Full path to the question file
   */
  getQuestionFilePath(stream) {
    if (!this.isInitialized) {
      throw new Error('QuestionsConfig not initialized. Call initialize() first.');
    }

    const fileName = `${stream.toLowerCase()}_questions.json`;
    return path.join(this.questionsPath, fileName);
  }

  /**
   * Check if a specific question file exists
   * @param {string} stream - Engineering stream
   * @returns {Promise<boolean>} True if file exists and is readable
   */
  async questionFileExists(stream) {
    try {
      const filePath = this.getQuestionFilePath(stream);
      await fs.access(filePath, fs.constants.R_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List all available question files
   * @returns {Promise<Array>} Array of available stream names
   */
  async listAvailableStreams() {
    if (!this.isQuestionsDirectoryValid()) {
      return [];
    }

    try {
      const files = await fs.readdir(this.questionsPath);
      const questionFiles = files.filter(file => file.endsWith('_questions.json'));
      
      return questionFiles.map(file => 
        file.replace('_questions.json', '').toUpperCase()
      );
    } catch (error) {
      console.error('Error listing available streams:', error.message);
      return [];
    }
  }
}

// Create singleton instance
const questionsConfig = new QuestionsConfig();

// Export both class and singleton
export { QuestionsConfig };
export default questionsConfig;