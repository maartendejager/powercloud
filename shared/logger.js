/**
 * Logger Class for PowerCloud Extension
 * 
 * Provides centralized, configurable logging functionality for all extension components.
 * Supports multiple log levels, context tracking, extension-specific formatting, and
 * integration with the health dashboard for comprehensive logging.
 * 
 * This class enhances the basic logging in BaseFeature while maintaining backward compatibility.
 */

/**
 * Log levels in order of severity
 */
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4  // Disables all logging
};

/**
 * Health Dashboard integration helper
 */
class HealthDashboardIntegration {
  static recordToHealthDashboard(level, message, data, context) {
    // Try to record to health dashboard if available
    try {
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'recordDebugLog',
          level,
          message: `[${context}] ${message}`,
          data: data || {}
        }).catch(() => {
          // Silently ignore if background script is not available
        });
      }
    } catch (error) {
      // Silently ignore health dashboard errors to prevent logging loops
    }
  }

  static shouldLogToConsole(level, globalLevel) {
    // Only log ERROR and WARN to console by default
    // DEBUG and INFO go primarily to health dashboard
    if (globalLevel === LogLevel.DEBUG) {
      return true; // Debug mode - log everything to console
    }
    return level >= LogLevel.WARN;
  }
}

/**
 * Logger class for PowerCloud extension components
 */
class Logger {
  /**
   * Create a new Logger instance
   * @param {string} context - The context/component name for this logger
   * @param {Object} options - Configuration options
   * @param {number} [options.level=LogLevel.INFO] - Minimum log level to output
   * @param {boolean} [options.enableTimestamp=true] - Include timestamps in log messages
   * @param {boolean} [options.enableContext=true] - Include context in log messages
   * @param {string} [options.prefix='PowerCloud'] - Prefix for all log messages
   * @param {boolean} [options.useHealthDashboard=true] - Send logs to health dashboard
   */
  constructor(context, options = {}) {
    this.context = context;
    this.level = options.level !== undefined ? options.level : LogLevel.INFO;
    this.enableTimestamp = options.enableTimestamp !== false;
    this.enableContext = options.enableContext !== false;
    this.prefix = options.prefix || 'PowerCloud';
    this.useHealthDashboard = options.useHealthDashboard !== false;
  }

  /**
   * Set the log level for this logger
   * @param {number} level - The minimum log level to output
   */
  setLevel(level) {
    this.level = level;
  }

  /**
   * Get the current log level
   * @returns {number} The current log level
   */
  getLevel() {
    return this.level;
  }

  /**
   * Check if a log level should be output
   * @param {number} level - The log level to check
   * @returns {boolean} True if the level should be logged
   */
  shouldLog(level) {
    return level >= this.level;
  }

  /**
   * Format a log message with context and timestamp
   * @param {string} level - The log level name
   * @param {string} message - The message to log
   * @returns {string} The formatted message
   */
  formatMessage(level, message) {
    let parts = [];
    
    if (this.enableTimestamp) {
      const timestamp = new Date().toISOString().slice(11, 23); // HH:mm:ss.sss
      parts.push(`[${timestamp}]`);
    }
    
    parts.push(`[${this.prefix}]`);
    
    if (this.enableContext) {
      parts.push(`[${this.context}]`);
    }
    
    parts.push(`[${level}]`);
    parts.push(message);
    
    return parts.join(' ');
  }

  /**
   * Log a debug message
   * @param {string} message - The message to log
   * @param {*} [data] - Additional data to log
   */
  debug(message, data = null) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const formattedMessage = this.formatMessage('DEBUG', message);
    
    // Send to health dashboard
    if (this.useHealthDashboard) {
      HealthDashboardIntegration.recordToHealthDashboard('debug', message, data, this.context);
    }
    
    // Only log to console in debug mode or if health dashboard is disabled
    if (HealthDashboardIntegration.shouldLogToConsole(LogLevel.DEBUG, this.level) || !this.useHealthDashboard) {
      if (data !== null) {
        console.debug(formattedMessage, data);
      } else {
        console.debug(formattedMessage);
      }
    }
  }

  /**
   * Log an info message
   * @param {string} message - The message to log
   * @param {*} [data] - Additional data to log
   */
  info(message, data = null) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const formattedMessage = this.formatMessage('INFO', message);
    
    // Send to health dashboard
    if (this.useHealthDashboard) {
      HealthDashboardIntegration.recordToHealthDashboard('info', message, data, this.context);
    }
    
    // Only log to console in debug mode or if health dashboard is disabled
    if (HealthDashboardIntegration.shouldLogToConsole(LogLevel.INFO, this.level) || !this.useHealthDashboard) {
      if (data !== null) {
        console.info(formattedMessage, data);
      } else {
        console.info(formattedMessage);
      }
    }
  }

  /**
   * Log a warning message
   * @param {string} message - The message to log
   * @param {*} [data] - Additional data to log
   */
  warn(message, data = null) {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const formattedMessage = this.formatMessage('WARN', message);
    
    // Send to health dashboard
    if (this.useHealthDashboard) {
      HealthDashboardIntegration.recordToHealthDashboard('warn', message, data, this.context);
    }
    
    // Always log warnings to console
    if (data !== null) {
      console.warn(formattedMessage, data);
    } else {
      console.warn(formattedMessage);
    }
  }

  /**
   * Log an error message
   * @param {string} message - The message to log
   * @param {*} [data] - Additional data to log (typically an Error object)
   */
  error(message, data = null) {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const formattedMessage = this.formatMessage('ERROR', message);
    
    // Send to health dashboard
    if (this.useHealthDashboard) {
      HealthDashboardIntegration.recordToHealthDashboard('error', message, data, this.context);
    }
    
    // Always log errors to console
    if (data !== null) {
      console.error(formattedMessage, data);
    } else {
      console.error(formattedMessage);
    }
  }

  /**
   * Create a child logger with the same configuration but different context
   * @param {string} childContext - The context for the child logger
   * @returns {Logger} A new Logger instance
   */
  createChild(childContext) {
    return new Logger(
      `${this.context}.${childContext}`,
      {
        level: this.level,
        enableTimestamp: this.enableTimestamp,
        enableContext: this.enableContext,
        prefix: this.prefix,
        useHealthDashboard: this.useHealthDashboard
      }
    );
  }
}

/**
 * Global logger factory and configuration
 */
class LoggerFactory {
  /**
   * Initialize the logger factory
   */
  constructor() {
    this.defaultLevel = LogLevel.INFO;
    this.globalConfig = {
      enableTimestamp: true,
      enableContext: true,
      prefix: 'PowerCloud',
      useHealthDashboard: true
    };
    this.loggers = new Map();
    this.stats = {
      totalLoggers: 0,
      globalLevel: 'INFO'
    };
  }

  /**
   * Set the default log level for all new loggers
   * @param {number} level - The default log level
   */
  setDefaultLevel(level) {
    this.defaultLevel = level;
    this.stats.globalLevel = Object.keys(LogLevel)[level] || 'UNKNOWN';
  }

  /**
   * Set global configuration for all new loggers
   * @param {Object} config - Configuration object
   */
  setGlobalConfig(config) {
    this.globalConfig = { ...this.globalConfig, ...config };
  }

  /**
   * Create a new logger instance
   * @param {string} context - The context/component name
   * @param {Object} [options] - Optional configuration overrides
   * @returns {Logger} A new Logger instance
   */
  createLogger(context, options = {}) {
    const config = {
      level: this.defaultLevel,
      ...this.globalConfig,
      ...options
    };
    
    const logger = new Logger(context, config);
    this.loggers.set(context, logger);
    this.stats.totalLoggers = this.loggers.size;
    
    return logger;
  }

  /**
   * Get an existing logger or create a new one
   * @param {string} context - The context/component name
   * @returns {Logger} Logger instance
   */
  getLogger(context) {
    return this.loggers.get(context) || this.createLogger(context);
  }

  /**
   * Enable debug mode globally (sets all loggers to DEBUG level)
   */
  enableDebugMode() {
    this.setDefaultLevel(LogLevel.DEBUG);
    // Update existing loggers
    for (const logger of this.loggers.values()) {
      logger.setLevel(LogLevel.DEBUG);
    }
  }

  /**
   * Disable all logging globally
   */
  disableLogging() {
    this.setDefaultLevel(LogLevel.NONE);
    // Update existing loggers
    for (const logger of this.loggers.values()) {
      logger.setLevel(LogLevel.NONE);
    }
  }

  /**
   * Get logger statistics
   * @returns {Object} Logger statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Create a fallback logger for use when the factory is not available
   * @param {string} context - Context for the fallback logger
   * @returns {Object} Fallback logger object
   */
  static createFallbackLogger(context) {
    return {
      debug: (message, data) => {
        // Send to health dashboard if possible
        HealthDashboardIntegration.recordToHealthDashboard('debug', message, data, context);
        // Only log to console in debug environments
        if (window.PowerCloudDebug) {
          console.debug(`[DEBUG][${context}]`, message, data || '');
        }
      },
      info: (message, data) => {
        // Send to health dashboard if possible
        HealthDashboardIntegration.recordToHealthDashboard('info', message, data, context);
        // Only log to console in debug environments
        if (window.PowerCloudDebug) {
          console.info(`[INFO][${context}]`, message, data || '');
        }
      },
      warn: (message, data) => {
        // Send to health dashboard if possible
        HealthDashboardIntegration.recordToHealthDashboard('warn', message, data, context);
        // Always log warnings to console
        console.warn(`[WARN][${context}]`, message, data || '');
      },
      error: (message, data) => {
        // Send to health dashboard if possible
        HealthDashboardIntegration.recordToHealthDashboard('error', message, data, context);
        // Always log errors to console
        console.error(`[ERROR][${context}]`, message, data || '');
      }
    };
  }
}

// Create global logger factory instance
const loggerFactory = new LoggerFactory();

// Make Logger classes and factory available globally
window.Logger = Logger;
window.LogLevel = LogLevel;
window.LoggerFactory = LoggerFactory;
window.loggerFactory = loggerFactory;

// Improved global logger factory with better fallback support
window.PowerCloudLoggerFactory = loggerFactory;

// Export for potential module usage in the future
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Logger, LogLevel, LoggerFactory, loggerFactory, HealthDashboardIntegration };
}
