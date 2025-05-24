/**
 * Feature Debugging Utilities for PowerCloud Extension
 * Phase 2.2 - Feature Validation Implementation
 * 
 * Provides enhanced debugging tools, inspection utilities, and diagnostic
 * capabilities for extension features with integration into debug mode.
 */

/**
 * Feature Debugger - Advanced debugging utilities for features
 */
class FeatureDebugger {
  constructor() {
    this.debugSessions = new Map();
    this.breakpoints = new Map();
    this.watchExpressions = new Map();
    this.inspectionData = new Map();
    
    // Initialize logger
    this.logger = window.PowerCloudLoggerFactory?.getLogger('FeatureDebugger') || {
      debug: (...args) => console.log('[DEBUG][FeatureDebugger]', ...args),
      info: (...args) => console.log('[INFO][FeatureDebugger]', ...args),
      warn: (...args) => console.warn('[WARN][FeatureDebugger]', ...args),
      error: (...args) => console.error('[ERROR][FeatureDebugger]', ...args)
    };
    
    this._initializeDebugInterface();
  }

  /**
   * Start a debugging session for a feature
   * @param {string} featureName - Name of the feature to debug
   * @param {Object} options - Debug session options
   * @returns {string} Debug session ID
   */
  startDebugSession(featureName, options = {}) {
    const sessionId = `debug-${featureName}-${Date.now()}`;
    
    const session = {
      id: sessionId,
      featureName,
      startTime: Date.now(),
      options: {
        verboseLogging: true,
        capturePerformance: true,
        trackStateChanges: true,
        recordInteractions: true,
        ...options
      },
      logs: [],
      stateSnapshots: [],
      performanceMarkers: [],
      interactions: [],
      active: true
    };
    
    this.debugSessions.set(sessionId, session);
    
    // Enable verbose logging for the feature
    this._enableVerboseLogging(featureName, sessionId);
    
    // Start performance monitoring
    if (session.options.capturePerformance) {
      this._startPerformanceCapture(featureName, sessionId);
    }
    
    this.logger.info(`Started debug session ${sessionId} for feature ${featureName}`);
    
    return sessionId;
  }

  /**
   * Stop a debugging session
   * @param {string} sessionId - Debug session ID
   * @returns {Object} Debug session summary
   */
  stopDebugSession(sessionId) {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Debug session not found: ${sessionId}`);
      return null;
    }
    
    session.active = false;
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    
    // Generate debug summary
    const summary = this._generateDebugSummary(session);
    
    this.logger.info(`Stopped debug session ${sessionId}, duration: ${session.duration}ms`);
    
    return summary;
  }

  /**
   * Inspect a feature's current state
   * @param {string} featureName - Name of the feature to inspect
   * @returns {Object} Feature inspection data
   */
  inspectFeature(featureName) {
    const inspectionId = `inspect-${featureName}-${Date.now()}`;
    
    const inspection = {
      id: inspectionId,
      featureName,
      timestamp: new Date().toISOString(),
      state: this._captureFeatureState(featureName),
      dom: this._captureDomState(featureName),
      performance: this._capturePerformanceState(featureName),
      errors: this._captureErrorState(featureName),
      health: this._captureHealthState(featureName)
    };
    
    this.inspectionData.set(inspectionId, inspection);
    
    this.logger.info(`Captured inspection data for feature ${featureName}`, inspection);
    
    return inspection;
  }

  /**
   * Set a breakpoint for feature debugging
   * @param {string} featureName - Name of the feature
   * @param {string} event - Event to break on (init, cleanup, error, etc.)
   * @param {Function} condition - Optional condition function
   * @returns {string} Breakpoint ID
   */
  setBreakpoint(featureName, event, condition = null) {
    const breakpointId = `bp-${featureName}-${event}-${Date.now()}`;
    
    const breakpoint = {
      id: breakpointId,
      featureName,
      event,
      condition,
      enabled: true,
      hitCount: 0,
      createdAt: Date.now()
    };
    
    this.breakpoints.set(breakpointId, breakpoint);
    
    this.logger.info(`Set breakpoint ${breakpointId} for ${featureName}:${event}`);
    
    return breakpointId;
  }

  /**
   * Remove a breakpoint
   * @param {string} breakpointId - Breakpoint ID to remove
   * @returns {boolean} True if breakpoint was removed
   */
  removeBreakpoint(breakpointId) {
    const removed = this.breakpoints.delete(breakpointId);
    if (removed) {
      this.logger.info(`Removed breakpoint ${breakpointId}`);
    }
    return removed;
  }

  /**
   * Add a watch expression for a feature
   * @param {string} featureName - Name of the feature
   * @param {string} expression - Expression to watch
   * @param {Function} evaluator - Function to evaluate the expression
   * @returns {string} Watch ID
   */
  addWatchExpression(featureName, expression, evaluator) {
    const watchId = `watch-${featureName}-${Date.now()}`;
    
    const watch = {
      id: watchId,
      featureName,
      expression,
      evaluator,
      values: [],
      enabled: true,
      createdAt: Date.now()
    };
    
    this.watchExpressions.set(watchId, watch);
    
    // Start watching
    this._startWatching(watch);
    
    this.logger.info(`Added watch expression ${watchId}: ${expression}`);
    
    return watchId;
  }

  /**
   * Remove a watch expression
   * @param {string} watchId - Watch ID to remove
   * @returns {boolean} True if watch was removed
   */
  removeWatchExpression(watchId) {
    const removed = this.watchExpressions.delete(watchId);
    if (removed) {
      this.logger.info(`Removed watch expression ${watchId}`);
    }
    return removed;
  }

  /**
   * Log debug information to an active session
   * @param {string} featureName - Name of the feature
   * @param {string} level - Log level (debug, info, warn, error)
   * @param {string} message - Log message
   * @param {any} data - Additional data
   */
  logToSession(featureName, level, message, data = null) {
    // Find active debug sessions for this feature
    const activeSessions = Array.from(this.debugSessions.values())
      .filter(session => session.featureName === featureName && session.active);
    
    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      stack: new Error().stack
    };
    
    activeSessions.forEach(session => {
      session.logs.push(logEntry);
      
      // Limit log entries to prevent memory growth
      if (session.logs.length > 1000) {
        session.logs = session.logs.slice(-1000);
      }
    });
    
    // Check breakpoints
    this._checkBreakpoints(featureName, 'log', { level, message, data });
  }

  /**
   * Capture a state snapshot for debugging
   * @param {string} featureName - Name of the feature
   * @param {string} event - Event that triggered the snapshot
   * @param {Object} state - State data to capture
   */
  captureStateSnapshot(featureName, event, state) {
    const activeSessions = Array.from(this.debugSessions.values())
      .filter(session => session.featureName === featureName && session.active && session.options.trackStateChanges);
    
    const snapshot = {
      timestamp: Date.now(),
      event,
      state: this._deepClone(state)
    };
    
    activeSessions.forEach(session => {
      session.stateSnapshots.push(snapshot);
      
      // Limit snapshots
      if (session.stateSnapshots.length > 100) {
        session.stateSnapshots = session.stateSnapshots.slice(-100);
      }
    });
    
    // Check breakpoints
    this._checkBreakpoints(featureName, event, state);
    
    // Update watch expressions
    this._updateWatchExpressions(featureName);
  }

  /**
   * Get debug information for a feature
   * @param {string} featureName - Name of the feature
   * @returns {Object} Debug information
   */
  getDebugInfo(featureName) {
    const activeSessions = Array.from(this.debugSessions.values())
      .filter(session => session.featureName === featureName);
    
    const breakpoints = Array.from(this.breakpoints.values())
      .filter(bp => bp.featureName === featureName);
    
    const watches = Array.from(this.watchExpressions.values())
      .filter(watch => watch.featureName === featureName);
    
    const inspections = Array.from(this.inspectionData.values())
      .filter(inspection => inspection.featureName === featureName);
    
    return {
      featureName,
      activeSessions: activeSessions.length,
      breakpoints: breakpoints.length,
      watchExpressions: watches.length,
      recentInspections: inspections.slice(-5),
      debugStatus: this._getDebugStatus(featureName)
    };
  }

  /**
   * Get all debugging data
   * @returns {Object} All debugging data
   */
  getAllDebugData() {
    return {
      sessions: Array.from(this.debugSessions.values()),
      breakpoints: Array.from(this.breakpoints.values()),
      watchExpressions: Array.from(this.watchExpressions.values()),
      inspections: Array.from(this.inspectionData.values())
    };
  }

  /**
   * Clear debugging data
   * @param {string} [featureName] - Optional feature name to clear specific data
   */
  clearDebugData(featureName) {
    if (featureName) {
      // Clear data for specific feature
      for (const [id, session] of this.debugSessions.entries()) {
        if (session.featureName === featureName) {
          this.debugSessions.delete(id);
        }
      }
      
      for (const [id, bp] of this.breakpoints.entries()) {
        if (bp.featureName === featureName) {
          this.breakpoints.delete(id);
        }
      }
      
      for (const [id, watch] of this.watchExpressions.entries()) {
        if (watch.featureName === featureName) {
          this.watchExpressions.delete(id);
        }
      }
      
      for (const [id, inspection] of this.inspectionData.entries()) {
        if (inspection.featureName === featureName) {
          this.inspectionData.delete(id);
        }
      }
    } else {
      // Clear all data
      this.debugSessions.clear();
      this.breakpoints.clear();
      this.watchExpressions.clear();
      this.inspectionData.clear();
    }
  }

  /**
   * Initialize debug interface integration
   * @private
   */
  _initializeDebugInterface() {
    // Integrate with existing debug mode if available
    if (window.DebugModeController) {
      this._integrateWithDebugMode();
    }
    
    // Add debugging methods to console for easy access
    if (typeof window !== 'undefined') {
      window.PowerCloudDebug = {
        inspectFeature: (name) => this.inspectFeature(name),
        startDebug: (name, options) => this.startDebugSession(name, options),
        stopDebug: (sessionId) => this.stopDebugSession(sessionId),
        setBreakpoint: (feature, event, condition) => this.setBreakpoint(feature, event, condition),
        getDebugInfo: (name) => this.getDebugInfo(name)
      };
    }
  }

  /**
   * Integrate with existing debug mode
   * @private
   */
  _integrateWithDebugMode() {
    try {
      const debugMode = window.DebugModeController;
      if (debugMode && debugMode.addDebugSection) {
        debugMode.addDebugSection('Feature Debugging', (container) => {
          this._createDebugUI(container);
        });
      }
    } catch (error) {
      this.logger.warn('Failed to integrate with debug mode:', error);
    }
  }

  /**
   * Create debug UI elements
   * @private
   */
  _createDebugUI(container) {
    const debugSection = document.createElement('div');
    debugSection.className = 'feature-debugger-section';
    
    debugSection.innerHTML = `
      <h4>Feature Debugging</h4>
      <div class="debug-controls">
        <button id="inspect-all-features">Inspect All Features</button>
        <button id="clear-debug-data">Clear Debug Data</button>
      </div>
      <div class="debug-info" id="debug-info-display">
        <p>Debug information will appear here...</p>
      </div>
    `;
    
    container.appendChild(debugSection);
    
    // Add event listeners
    debugSection.querySelector('#inspect-all-features').addEventListener('click', () => {
      this._inspectAllFeatures();
    });
    
    debugSection.querySelector('#clear-debug-data').addEventListener('click', () => {
      this.clearDebugData();
      this._updateDebugDisplay();
    });
    
    // Initial display update
    this._updateDebugDisplay();
  }

  /**
   * Inspect all active features
   * @private
   */
  _inspectAllFeatures() {
    // Get list of features from FeatureManager if available
    const features = this._getActiveFeatures();
    
    features.forEach(featureName => {
      this.inspectFeature(featureName);
    });
    
    this._updateDebugDisplay();
  }

  /**
   * Update debug display in UI
   * @private
   */
  _updateDebugDisplay() {
    const display = document.getElementById('debug-info-display');
    if (!display) return;
    
    const debugData = this.getAllDebugData();
    const html = `
      <h5>Debug Summary</h5>
      <p>Active Sessions: ${debugData.sessions.filter(s => s.active).length}</p>
      <p>Breakpoints: ${debugData.breakpoints.length}</p>
      <p>Watch Expressions: ${debugData.watchExpressions.length}</p>
      <p>Recent Inspections: ${debugData.inspections.length}</p>
      
      <h5>Recent Activity</h5>
      <ul>
        ${debugData.inspections.slice(-5).map(inspection => 
          `<li>${inspection.featureName} - ${new Date(inspection.timestamp).toLocaleTimeString()}</li>`
        ).join('')}
      </ul>
    `;
    
    display.innerHTML = html;
  }

  /**
   * Get list of active features
   * @private
   */
  _getActiveFeatures() {
    // Try to get from FeatureManager
    if (window.FeatureManager && window.FeatureManager.activeFeatures) {
      return Array.from(window.FeatureManager.activeFeatures);
    }
    
    // Fallback: get from debug sessions
    return Array.from(new Set(
      Array.from(this.debugSessions.values()).map(session => session.featureName)
    ));
  }

  /**
   * Capture feature state for inspection
   * @private
   */
  _captureFeatureState(featureName) {
    // Implementation would depend on how features store state
    // This is a basic framework that can be extended
    
    return {
      featureName,
      timestamp: Date.now(),
      // Add feature-specific state capture logic here
    };
  }

  /**
   * Capture DOM state for a feature
   * @private
   */
  _captureDomState(featureName) {
    const selectors = [
      `[id*="${featureName}"]`,
      `[class*="${featureName}"]`,
      `[data-feature="${featureName}"]`,
      `.powercloud-${featureName}`
    ];
    
    const elements = [];
    selectors.forEach(selector => {
      const found = document.querySelectorAll(selector);
      found.forEach(el => {
        elements.push({
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          textContent: el.textContent?.substring(0, 100)
        });
      });
    });
    
    return { elementCount: elements.length, elements };
  }

  /**
   * Capture performance state for a feature
   * @private
   */
  _capturePerformanceState(featureName) {
    // Get performance metrics from PerformanceMonitor if available
    if (window.PerformanceMonitor) {
      return window.PerformanceMonitor.getFeaturePerformanceSummary(featureName);
    }
    
    return { message: 'PerformanceMonitor not available' };
  }

  /**
   * Capture error state for a feature
   * @private
   */
  _captureErrorState(featureName) {
    // Get error information from ErrorTracker if available
    if (window.ErrorTracker) {
      return window.ErrorTracker.getFeatureErrorStats(featureName);
    }
    
    return { message: 'ErrorTracker not available' };
  }

  /**
   * Capture health state for a feature
   * @private
   */
  _captureHealthState(featureName) {
    // Get health information from FeatureValidator if available
    if (window.FeatureValidator) {
      return window.FeatureValidator.getHealthCheckResult(featureName);
    }
    
    return { message: 'FeatureValidator not available' };
  }

  /**
   * Enable verbose logging for a feature
   * @private
   */
  _enableVerboseLogging(featureName, sessionId) {
    // Implementation would hook into the feature's logging system
    this.logger.debug(`Enabled verbose logging for ${featureName} in session ${sessionId}`);
  }

  /**
   * Start performance capture for debugging
   * @private
   */
  _startPerformanceCapture(featureName, sessionId) {
    // Implementation would integrate with PerformanceMonitor
    this.logger.debug(`Started performance capture for ${featureName} in session ${sessionId}`);
  }

  /**
   * Generate debug session summary
   * @private
   */
  _generateDebugSummary(session) {
    return {
      sessionId: session.id,
      featureName: session.featureName,
      duration: session.duration,
      totalLogs: session.logs.length,
      stateSnapshots: session.stateSnapshots.length,
      performanceMarkers: session.performanceMarkers.length,
      summary: `Debug session for ${session.featureName} ran for ${session.duration}ms`
    };
  }

  /**
   * Check breakpoints for a feature event
   * @private
   */
  _checkBreakpoints(featureName, event, data) {
    const relevantBreakpoints = Array.from(this.breakpoints.values())
      .filter(bp => bp.featureName === featureName && bp.event === event && bp.enabled);
    
    relevantBreakpoints.forEach(bp => {
      bp.hitCount++;
      
      let shouldBreak = true;
      if (bp.condition && typeof bp.condition === 'function') {
        try {
          shouldBreak = bp.condition(data);
        } catch (error) {
          this.logger.warn(`Breakpoint condition error: ${error.message}`);
        }
      }
      
      if (shouldBreak) {
        this.logger.warn(`Breakpoint hit: ${bp.id} - ${featureName}:${event}`, { data, breakpoint: bp });
        // In a real debugger, this would pause execution
        debugger; // eslint-disable-line no-debugger
      }
    });
  }

  /**
   * Start watching an expression
   * @private
   */
  _startWatching(watch) {
    // Set up periodic evaluation of watch expression
    const interval = setInterval(() => {
      if (!this.watchExpressions.has(watch.id)) {
        clearInterval(interval);
        return;
      }
      
      try {
        const value = watch.evaluator();
        watch.values.push({
          timestamp: Date.now(),
          value: this._deepClone(value)
        });
        
        // Limit stored values
        if (watch.values.length > 100) {
          watch.values = watch.values.slice(-100);
        }
      } catch (error) {
        this.logger.warn(`Watch expression error: ${error.message}`);
      }
    }, 1000); // Check every second
    
    watch.interval = interval;
  }

  /**
   * Update watch expressions for a feature
   * @private
   */
  _updateWatchExpressions(featureName) {
    const watches = Array.from(this.watchExpressions.values())
      .filter(watch => watch.featureName === featureName && watch.enabled);
    
    watches.forEach(watch => {
      try {
        const value = watch.evaluator();
        watch.values.push({
          timestamp: Date.now(),
          value: this._deepClone(value)
        });
        
        if (watch.values.length > 100) {
          watch.values = watch.values.slice(-100);
        }
      } catch (error) {
        this.logger.warn(`Watch expression update error: ${error.message}`);
      }
    });
  }

  /**
   * Get debug status for a feature
   * @private
   */
  _getDebugStatus(featureName) {
    const activeSessions = Array.from(this.debugSessions.values())
      .filter(session => session.featureName === featureName && session.active);
    
    return {
      isBeingDebugged: activeSessions.length > 0,
      activeSessionCount: activeSessions.length,
      hasBreakpoints: Array.from(this.breakpoints.values())
        .some(bp => bp.featureName === featureName && bp.enabled),
      hasWatchExpressions: Array.from(this.watchExpressions.values())
        .some(watch => watch.featureName === featureName && watch.enabled)
    };
  }

  /**
   * Deep clone an object for safe storage
   * @private
   */
  _deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      return { error: 'Unable to clone object', type: typeof obj };
    }
  }
}

// Make FeatureDebugger available globally
window.FeatureDebugger = FeatureDebugger;

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeatureDebugger;
}
