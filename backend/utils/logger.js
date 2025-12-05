import metricsCollector from './metricsCollector.js';

/**
 * Structured Logging Utility for Fallback Question Service
 * Provides consistent logging format and performance monitoring
 */

/**
 * Log levels for different types of events
 */
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Create a structured log entry
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Structured log entry
 */
function createLogEntry(level, message, metadata = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'fallback-questions',
    ...metadata
  };
}

/**
 * Format and output log entry
 * @param {Object} logEntry - Structured log entry
 */
function outputLog(logEntry) {
  const logString = JSON.stringify(logEntry);
  
  switch (logEntry.level) {
    case LOG_LEVELS.ERROR:
      console.error(logString);
      break;
    case LOG_LEVELS.WARN:
      console.warn(logString);
      break;
    case LOG_LEVELS.INFO:
      console.info(logString);
      break;
    case LOG_LEVELS.DEBUG:
      console.log(logString);
      break;
    default:
      console.log(logString);
  }
}

/**
 * Fallback Questions Logger
 * Provides structured logging for fallback question service events
 */
class FallbackQuestionsLogger {
  constructor() {
    this.isDebugEnabled = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
  }

  /**
   * Log fallback activation event
   * @param {Object} params - Fallback activation parameters
   */
  logFallbackActivation(params) {
    const { stream, subject, aiError, questionsSelected, loadTime, source } = params;
    
    // Record metrics
    metricsCollector.recordFallbackActivation({
      stream,
      subject,
      aiError,
      questionsSelected,
      loadTime
    });
    
    const logEntry = createLogEntry(LOG_LEVELS.INFO, 'Fallback question service activated', {
      event: 'fallback_activation',
      stream,
      subject,
      aiError: aiError || 'Unknown AI error',
      questionsSelected: questionsSelected || 0,
      loadTimeMs: loadTime,
      source: source || 'fallback',
      performance: {
        loadTime
      }
    });

    outputLog(logEntry);
  }

  /**
   * Log question loading performance metrics
   * @param {Object} params - Performance parameters
   */
  logQuestionLoadingPerformance(params) {
    const { 
      stream, 
      subject, 
      loadTimeMs, 
      cacheHit, 
      totalQuestions, 
      mcqCount, 
      descriptiveCount,
      filePath 
    } = params;

    // Record metrics
    metricsCollector.recordQuestionLoadingPerformance({
      stream,
      subject,
      loadTimeMs,
      cacheHit,
      totalQuestions
    });

    const logEntry = createLogEntry(LOG_LEVELS.INFO, 'Question loading performance', {
      event: 'question_loading',
      stream,
      subject,
      filePath,
      performance: {
        loadTimeMs,
        cacheHit: cacheHit || false
      },
      questionCounts: {
        total: totalQuestions || 0,
        mcq: mcqCount || 0,
        descriptive: descriptiveCount || 0
      }
    });

    outputLog(logEntry);
  }

  /**
   * Log error with file path and validation details
   * @param {Object} params - Error parameters
   */
  logError(params) {
    const { 
      message, 
      error, 
      stream, 
      subject, 
      filePath, 
      validationDetails, 
      operation 
    } = params;

    // Record metrics
    metricsCollector.recordError({
      errorType: error?.code || error?.name || 'UnknownError',
      operation: operation || 'unknown',
      stream,
      subject,
      message: error?.message || message
    });

    const logEntry = createLogEntry(LOG_LEVELS.ERROR, message, {
      event: 'error',
      operation: operation || 'unknown',
      stream,
      subject,
      filePath,
      error: {
        message: error?.message || 'Unknown error',
        code: error?.code,
        stack: this.isDebugEnabled ? error?.stack : undefined
      },
      validationDetails
    });

    outputLog(logEntry);
  }

  /**
   * Log warning events
   * @param {Object} params - Warning parameters
   */
  logWarning(params) {
    const { message, stream, subject, filePath, details } = params;

    const logEntry = createLogEntry(LOG_LEVELS.WARN, message, {
      event: 'warning',
      stream,
      subject,
      filePath,
      details
    });

    outputLog(logEntry);
  }

  /**
   * Log cache operations
   * @param {Object} params - Cache operation parameters
   */
  logCacheOperation(params) {
    const { operation, cacheKey, hit, miss, expired, totalEntries } = params;

    // Record metrics
    metricsCollector.recordCacheOperation({
      operation,
      cacheKey,
      hit,
      miss,
      expired
    });

    const logEntry = createLogEntry(LOG_LEVELS.DEBUG, `Cache ${operation}`, {
      event: 'cache_operation',
      operation,
      cacheKey,
      cacheStats: {
        hit: hit || false,
        miss: miss || false,
        expired: expired || false,
        totalEntries: totalEntries || 0
      }
    });

    if (this.isDebugEnabled) {
      outputLog(logEntry);
    }
  }

  /**
   * Log configuration events
   * @param {Object} params - Configuration parameters
   */
  logConfiguration(params) {
    const { 
      questionsPath, 
      isValid, 
      environmentVariable, 
      validationDetails, 
      operation 
    } = params;

    const logEntry = createLogEntry(LOG_LEVELS.INFO, `Configuration ${operation}`, {
      event: 'configuration',
      operation: operation || 'unknown',
      configuration: {
        questionsPath,
        isValid: isValid || false,
        environmentVariable: environmentVariable || null
      },
      validationDetails
    });

    outputLog(logEntry);
  }

  /**
   * Log question selection events
   * @param {Object} params - Selection parameters
   */
  logQuestionSelection(params) {
    const { 
      stream, 
      subject, 
      selectionTimeMs, 
      totalAvailable, 
      selectedCount, 
      mcqSelected, 
      descriptiveSelected 
    } = params;

    // Record metrics
    metricsCollector.recordQuestionSelectionPerformance({
      stream,
      subject,
      selectionTimeMs,
      totalAvailable,
      selectedCount
    });

    const logEntry = createLogEntry(LOG_LEVELS.INFO, 'Random question selection completed', {
      event: 'question_selection',
      stream,
      subject,
      performance: {
        selectionTimeMs
      },
      selection: {
        totalAvailable: totalAvailable || 0,
        selectedCount: selectedCount || 0,
        mcqSelected: mcqSelected || 0,
        descriptiveSelected: descriptiveSelected || 0
      }
    });

    outputLog(logEntry);
  }

  /**
   * Log directory validation events
   * @param {Object} params - Validation parameters
   */
  logDirectoryValidation(params) {
    const { 
      questionsPath, 
      isValid, 
      totalFiles, 
      questionFiles, 
      availableStreams, 
      error 
    } = params;

    const level = isValid ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR;
    const message = isValid ? 'Questions directory validation successful' : 'Questions directory validation failed';

    const logEntry = createLogEntry(level, message, {
      event: 'directory_validation',
      questionsPath,
      isValid: isValid || false,
      directoryStats: {
        totalFiles: totalFiles || 0,
        questionFiles: questionFiles || 0,
        availableStreams: availableStreams || []
      },
      error: error ? {
        message: error.message,
        code: error.code
      } : null
    });

    outputLog(logEntry);
  }

  /**
   * Create a performance timer
   * @param {string} operation - Operation name
   * @returns {Object} Timer object with stop method
   */
  createTimer(operation) {
    const startTime = Date.now();
    
    return {
      stop: () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        if (this.isDebugEnabled) {
          const logEntry = createLogEntry(LOG_LEVELS.DEBUG, `Performance timer: ${operation}`, {
            event: 'performance_timer',
            operation,
            performance: {
              durationMs: duration,
              startTime: new Date(startTime).toISOString(),
              endTime: new Date(endTime).toISOString()
            }
          });
          
          outputLog(logEntry);
        }
        
        return duration;
      }
    };
  }
}

// Create singleton instance
const fallbackQuestionsLogger = new FallbackQuestionsLogger();

// Export both class and singleton
export { FallbackQuestionsLogger, LOG_LEVELS };
export default fallbackQuestionsLogger;