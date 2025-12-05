/**
 * Performance Metrics Collector for Fallback Question Service
 * Tracks and aggregates performance metrics and usage statistics
 */

/**
 * Metrics storage and aggregation class
 */
class MetricsCollector {
  constructor() {
    this.metrics = {
      fallbackActivations: {
        total: 0,
        byStream: {},
        bySubject: {},
        lastActivation: null,
        activationHistory: []
      },
      questionLoading: {
        totalLoads: 0,
        totalLoadTime: 0,
        averageLoadTime: 0,
        loadsByStream: {},
        loadsBySubject: {},
        performanceHistory: []
      },
      questionSelection: {
        totalSelections: 0,
        totalSelectionTime: 0,
        averageSelectionTime: 0,
        selectionsByStream: {},
        selectionsBySubject: {},
        performanceHistory: []
      },
      cache: {
        hits: 0,
        misses: 0,
        expired: 0,
        hitRatio: 0,
        totalRequests: 0,
        cacheHistory: []
      },
      errors: {
        total: 0,
        byType: {},
        byOperation: {},
        errorHistory: []
      }
    };

    // Configuration for history retention
    this.maxHistoryEntries = 1000;
    this.metricsStartTime = Date.now();
  }

  /**
   * Record fallback activation event
   * @param {Object} params - Activation parameters
   */
  recordFallbackActivation(params) {
    const { stream, subject, aiError, questionsSelected, loadTime } = params;
    const timestamp = new Date().toISOString();

    // Update total count
    this.metrics.fallbackActivations.total++;
    this.metrics.fallbackActivations.lastActivation = timestamp;

    // Update by stream
    if (!this.metrics.fallbackActivations.byStream[stream]) {
      this.metrics.fallbackActivations.byStream[stream] = 0;
    }
    this.metrics.fallbackActivations.byStream[stream]++;

    // Update by subject
    const subjectKey = `${stream}/${subject}`;
    if (!this.metrics.fallbackActivations.bySubject[subjectKey]) {
      this.metrics.fallbackActivations.bySubject[subjectKey] = 0;
    }
    this.metrics.fallbackActivations.bySubject[subjectKey]++;

    // Add to history
    const historyEntry = {
      timestamp,
      stream,
      subject,
      aiError: aiError || 'Unknown',
      questionsSelected: questionsSelected || 0,
      loadTime: loadTime || 0
    };

    this.metrics.fallbackActivations.activationHistory.push(historyEntry);
    this._trimHistory(this.metrics.fallbackActivations.activationHistory);
  }

  /**
   * Record question loading performance
   * @param {Object} params - Loading performance parameters
   */
  recordQuestionLoadingPerformance(params) {
    const { stream, subject, loadTimeMs, cacheHit, totalQuestions } = params;
    const timestamp = new Date().toISOString();

    // Update totals
    this.metrics.questionLoading.totalLoads++;
    this.metrics.questionLoading.totalLoadTime += loadTimeMs || 0;
    this.metrics.questionLoading.averageLoadTime = 
      this.metrics.questionLoading.totalLoadTime / this.metrics.questionLoading.totalLoads;

    // Update by stream
    if (!this.metrics.questionLoading.loadsByStream[stream]) {
      this.metrics.questionLoading.loadsByStream[stream] = {
        count: 0,
        totalTime: 0,
        averageTime: 0
      };
    }
    const streamStats = this.metrics.questionLoading.loadsByStream[stream];
    streamStats.count++;
    streamStats.totalTime += loadTimeMs || 0;
    streamStats.averageTime = streamStats.totalTime / streamStats.count;

    // Update by subject
    const subjectKey = `${stream}/${subject}`;
    if (!this.metrics.questionLoading.loadsBySubject[subjectKey]) {
      this.metrics.questionLoading.loadsBySubject[subjectKey] = {
        count: 0,
        totalTime: 0,
        averageTime: 0
      };
    }
    const subjectStats = this.metrics.questionLoading.loadsBySubject[subjectKey];
    subjectStats.count++;
    subjectStats.totalTime += loadTimeMs || 0;
    subjectStats.averageTime = subjectStats.totalTime / subjectStats.count;

    // Add to history
    const historyEntry = {
      timestamp,
      stream,
      subject,
      loadTimeMs: loadTimeMs || 0,
      cacheHit: cacheHit || false,
      totalQuestions: totalQuestions || 0
    };

    this.metrics.questionLoading.performanceHistory.push(historyEntry);
    this._trimHistory(this.metrics.questionLoading.performanceHistory);
  }

  /**
   * Record question selection performance
   * @param {Object} params - Selection performance parameters
   */
  recordQuestionSelectionPerformance(params) {
    const { stream, subject, selectionTimeMs, totalAvailable, selectedCount } = params;
    const timestamp = new Date().toISOString();

    // Update totals
    this.metrics.questionSelection.totalSelections++;
    this.metrics.questionSelection.totalSelectionTime += selectionTimeMs || 0;
    this.metrics.questionSelection.averageSelectionTime = 
      this.metrics.questionSelection.totalSelectionTime / this.metrics.questionSelection.totalSelections;

    // Update by stream
    if (!this.metrics.questionSelection.selectionsByStream[stream]) {
      this.metrics.questionSelection.selectionsByStream[stream] = {
        count: 0,
        totalTime: 0,
        averageTime: 0
      };
    }
    const streamStats = this.metrics.questionSelection.selectionsByStream[stream];
    streamStats.count++;
    streamStats.totalTime += selectionTimeMs || 0;
    streamStats.averageTime = streamStats.totalTime / streamStats.count;

    // Update by subject
    const subjectKey = `${stream}/${subject}`;
    if (!this.metrics.questionSelection.selectionsBySubject[subjectKey]) {
      this.metrics.questionSelection.selectionsBySubject[subjectKey] = {
        count: 0,
        totalTime: 0,
        averageTime: 0
      };
    }
    const subjectStats = this.metrics.questionSelection.selectionsBySubject[subjectKey];
    subjectStats.count++;
    subjectStats.totalTime += selectionTimeMs || 0;
    subjectStats.averageTime = subjectStats.totalTime / subjectStats.count;

    // Add to history
    const historyEntry = {
      timestamp,
      stream,
      subject,
      selectionTimeMs: selectionTimeMs || 0,
      totalAvailable: totalAvailable || 0,
      selectedCount: selectedCount || 0
    };

    this.metrics.questionSelection.performanceHistory.push(historyEntry);
    this._trimHistory(this.metrics.questionSelection.performanceHistory);
  }

  /**
   * Record cache operation
   * @param {Object} params - Cache operation parameters
   */
  recordCacheOperation(params) {
    const { operation, cacheKey, hit, miss, expired } = params;
    const timestamp = new Date().toISOString();

    // Update cache statistics
    if (hit) {
      this.metrics.cache.hits++;
    }
    if (miss) {
      this.metrics.cache.misses++;
    }
    if (expired) {
      this.metrics.cache.expired++;
    }

    // Update totals and ratios
    this.metrics.cache.totalRequests = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRatio = this.metrics.cache.totalRequests > 0 
      ? (this.metrics.cache.hits / this.metrics.cache.totalRequests) * 100 
      : 0;

    // Add to history
    const historyEntry = {
      timestamp,
      operation,
      cacheKey,
      hit: hit || false,
      miss: miss || false,
      expired: expired || false
    };

    this.metrics.cache.cacheHistory.push(historyEntry);
    this._trimHistory(this.metrics.cache.cacheHistory);
  }

  /**
   * Record error event
   * @param {Object} params - Error parameters
   */
  recordError(params) {
    const { errorType, operation, stream, subject, message } = params;
    const timestamp = new Date().toISOString();

    // Update total count
    this.metrics.errors.total++;

    // Update by error type
    if (!this.metrics.errors.byType[errorType]) {
      this.metrics.errors.byType[errorType] = 0;
    }
    this.metrics.errors.byType[errorType]++;

    // Update by operation
    if (!this.metrics.errors.byOperation[operation]) {
      this.metrics.errors.byOperation[operation] = 0;
    }
    this.metrics.errors.byOperation[operation]++;

    // Add to history
    const historyEntry = {
      timestamp,
      errorType,
      operation,
      stream,
      subject,
      message: message || 'Unknown error'
    };

    this.metrics.errors.errorHistory.push(historyEntry);
    this._trimHistory(this.metrics.errors.errorHistory);
  }

  /**
   * Get current metrics summary
   * @returns {Object} Metrics summary
   */
  getMetricsSummary() {
    const uptime = Date.now() - this.metricsStartTime;
    
    return {
      uptime: {
        milliseconds: uptime,
        seconds: Math.floor(uptime / 1000),
        minutes: Math.floor(uptime / (1000 * 60)),
        hours: Math.floor(uptime / (1000 * 60 * 60))
      },
      fallbackActivations: {
        total: this.metrics.fallbackActivations.total,
        rate: this._calculateRate(this.metrics.fallbackActivations.total, uptime),
        lastActivation: this.metrics.fallbackActivations.lastActivation,
        topStreams: this._getTopEntries(this.metrics.fallbackActivations.byStream, 5),
        topSubjects: this._getTopEntries(this.metrics.fallbackActivations.bySubject, 5)
      },
      performance: {
        questionLoading: {
          totalLoads: this.metrics.questionLoading.totalLoads,
          averageLoadTime: Math.round(this.metrics.questionLoading.averageLoadTime * 100) / 100,
          loadRate: this._calculateRate(this.metrics.questionLoading.totalLoads, uptime)
        },
        questionSelection: {
          totalSelections: this.metrics.questionSelection.totalSelections,
          averageSelectionTime: Math.round(this.metrics.questionSelection.averageSelectionTime * 100) / 100,
          selectionRate: this._calculateRate(this.metrics.questionSelection.totalSelections, uptime)
        }
      },
      cache: {
        hits: this.metrics.cache.hits,
        misses: this.metrics.cache.misses,
        expired: this.metrics.cache.expired,
        hitRatio: Math.round(this.metrics.cache.hitRatio * 100) / 100,
        totalRequests: this.metrics.cache.totalRequests
      },
      errors: {
        total: this.metrics.errors.total,
        rate: this._calculateRate(this.metrics.errors.total, uptime),
        byType: this.metrics.errors.byType,
        byOperation: this.metrics.errors.byOperation
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get detailed metrics for a specific category
   * @param {string} category - Metrics category
   * @returns {Object} Detailed metrics
   */
  getDetailedMetrics(category) {
    if (!this.metrics[category]) {
      throw new Error(`Unknown metrics category: ${category}`);
    }

    return {
      category,
      data: this.metrics[category],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get performance trends over time
   * @param {number} hours - Number of hours to analyze (default: 24)
   * @returns {Object} Performance trends
   */
  getPerformanceTrends(hours = 24) {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    const recentActivations = this.metrics.fallbackActivations.activationHistory
      .filter(entry => new Date(entry.timestamp) > cutoffTime);
    
    const recentLoadings = this.metrics.questionLoading.performanceHistory
      .filter(entry => new Date(entry.timestamp) > cutoffTime);
    
    const recentSelections = this.metrics.questionSelection.performanceHistory
      .filter(entry => new Date(entry.timestamp) > cutoffTime);

    return {
      timeRange: {
        hours,
        from: cutoffTime.toISOString(),
        to: new Date().toISOString()
      },
      trends: {
        fallbackActivations: {
          count: recentActivations.length,
          averageLoadTime: this._calculateAverage(recentActivations, 'loadTime')
        },
        questionLoading: {
          count: recentLoadings.length,
          averageLoadTime: this._calculateAverage(recentLoadings, 'loadTimeMs'),
          cacheHitRate: this._calculateCacheHitRate(recentLoadings)
        },
        questionSelection: {
          count: recentSelections.length,
          averageSelectionTime: this._calculateAverage(recentSelections, 'selectionTimeMs')
        }
      }
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics = {
      fallbackActivations: {
        total: 0,
        byStream: {},
        bySubject: {},
        lastActivation: null,
        activationHistory: []
      },
      questionLoading: {
        totalLoads: 0,
        totalLoadTime: 0,
        averageLoadTime: 0,
        loadsByStream: {},
        loadsBySubject: {},
        performanceHistory: []
      },
      questionSelection: {
        totalSelections: 0,
        totalSelectionTime: 0,
        averageSelectionTime: 0,
        selectionsByStream: {},
        selectionsBySubject: {},
        performanceHistory: []
      },
      cache: {
        hits: 0,
        misses: 0,
        expired: 0,
        hitRatio: 0,
        totalRequests: 0,
        cacheHistory: []
      },
      errors: {
        total: 0,
        byType: {},
        byOperation: {},
        errorHistory: []
      }
    };

    this.metricsStartTime = Date.now();
  }

  /**
   * Trim history arrays to prevent memory leaks
   * @param {Array} historyArray - History array to trim
   * @private
   */
  _trimHistory(historyArray) {
    if (historyArray.length > this.maxHistoryEntries) {
      historyArray.splice(0, historyArray.length - this.maxHistoryEntries);
    }
  }

  /**
   * Calculate rate per hour
   * @param {number} count - Total count
   * @param {number} uptimeMs - Uptime in milliseconds
   * @returns {number} Rate per hour
   * @private
   */
  _calculateRate(count, uptimeMs) {
    const hours = uptimeMs / (1000 * 60 * 60);
    return hours > 0 ? Math.round((count / hours) * 100) / 100 : 0;
  }

  /**
   * Get top entries from an object
   * @param {Object} obj - Object to analyze
   * @param {number} limit - Number of top entries
   * @returns {Array} Top entries
   * @private
   */
  _getTopEntries(obj, limit) {
    return Object.entries(obj)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([key, value]) => ({ key, value }));
  }

  /**
   * Calculate average of a property in an array
   * @param {Array} array - Array of objects
   * @param {string} property - Property to average
   * @returns {number} Average value
   * @private
   */
  _calculateAverage(array, property) {
    if (array.length === 0) return 0;
    const sum = array.reduce((acc, item) => acc + (item[property] || 0), 0);
    return Math.round((sum / array.length) * 100) / 100;
  }

  /**
   * Calculate cache hit rate from loading history
   * @param {Array} loadings - Loading history entries
   * @returns {number} Cache hit rate percentage
   * @private
   */
  _calculateCacheHitRate(loadings) {
    if (loadings.length === 0) return 0;
    const hits = loadings.filter(entry => entry.cacheHit).length;
    return Math.round((hits / loadings.length) * 100 * 100) / 100;
  }
}

// Create singleton instance
const metricsCollector = new MetricsCollector();

// Export both class and singleton
export { MetricsCollector };
export default metricsCollector;