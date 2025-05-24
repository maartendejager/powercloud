/**
 * SettingsManager - Centralized configuration management for PowerCloud Extension
 * 
 * Provides a unified interface for managing extension settings, user preferences,
 * feature toggles, and environment-specific configurations with validation and
 * storage capabilities.
 * 
 * @version 1.0.0
 * @author PowerCloud Extension Team
 */

/**
 * Configuration schema definitions for validation
 */
const CONFIG_SCHEMA = {
  // Core extension settings
  core: {
    debugMode: { type: 'boolean', default: false },
    logLevel: { type: 'string', default: 'info', enum: ['debug', 'info', 'warn', 'error'] },
    enablePerformanceMonitoring: { type: 'boolean', default: true },
    enableErrorTracking: { type: 'boolean', default: true }
  },
  
  // Feature toggles
  features: {
    adyenCard: { type: 'boolean', default: true },
    adyenBook: { type: 'boolean', default: true },
    adyenEntries: { type: 'boolean', default: true },
    uiVisibilityManager: { type: 'boolean', default: true },
    featureValidation: { type: 'boolean', default: true }
  },
  
  // User interface preferences
  ui: {
    theme: { type: 'string', default: 'auto', enum: ['light', 'dark', 'auto'] },
    compactMode: { type: 'boolean', default: false },
    showNotifications: { type: 'boolean', default: true },
    animationsEnabled: { type: 'boolean', default: true }
  },
  
  // Performance and monitoring settings
  performance: {
    initializationTimeout: { type: 'number', default: 5000, min: 1000, max: 30000 },
    healthCheckInterval: { type: 'number', default: 30000, min: 5000, max: 300000 },
    performanceThresholds: {
      type: 'object',
      default: {
        initializationTime: 500,
        cleanupTime: 100,
        memoryGrowth: 10485760, // 10MB
        domElementLimit: 100,
        eventListenerLimit: 50
      }
    }
  },
  
  // Development and debugging
  development: {
    mockApi: { type: 'boolean', default: false },
    verboseLogging: { type: 'boolean', default: false },
    enableTestMode: { type: 'boolean', default: false },
    showDebugPanel: { type: 'boolean', default: false }
  }
};

/**
 * Environment-specific configuration overrides
 */
const ENVIRONMENT_CONFIGS = {
  development: {
    core: {
      debugMode: true,
      logLevel: 'debug'
    },
    development: {
      verboseLogging: true,
      showDebugPanel: true
    }
  },
  
  production: {
    core: {
      debugMode: false,
      logLevel: 'warn'
    },
    development: {
      mockApi: false,
      verboseLogging: false,
      enableTestMode: false,
      showDebugPanel: false
    }
  },
  
  testing: {
    core: {
      debugMode: true,
      logLevel: 'debug',
      enablePerformanceMonitoring: false
    },
    development: {
      enableTestMode: true,
      mockApi: true
    }
  }
};

/**
 * Main SettingsManager class for configuration management
 */
class SettingsManager {
  /**
   * Create a SettingsManager instance
   * @param {Object} options - Configuration options
   * @param {string} [options.environment='auto'] - Environment mode
   * @param {string} [options.storageArea='local'] - Chrome storage area to use
   * @param {boolean} [options.autoSync=true] - Enable automatic syncing
   */
  constructor(options = {}) {
    this.environment = options.environment || this.detectEnvironment();
    this.storageArea = options.storageArea || 'local';
    this.autoSync = options.autoSync !== false;
    
    // Internal state
    this.settings = {};
    this.listeners = new Map();
    this.initialized = false;
    this.syncInProgress = false;
    
    // Initialize logger
    this.logger = window.PowerCloudLoggerFactory?.getLogger('SettingsManager') || {
      debug: (...args) => console.log('[DEBUG][SettingsManager]', ...args),
      info: (...args) => console.log('[INFO][SettingsManager]', ...args),
      warn: (...args) => console.warn('[WARN][SettingsManager]', ...args),
      error: (...args) => console.error('[ERROR][SettingsManager]', ...args)
    };
    
    // Event listeners for storage changes
    this.boundStorageListener = this.handleStorageChange.bind(this);
    
    this.logger.info('SettingsManager created', { environment: this.environment, storageArea: this.storageArea });
  }
  
  /**
   * Initialize the settings manager and load existing settings
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      this.logger.warn('SettingsManager already initialized');
      return;
    }
    
    try {
      this.logger.info('Initializing SettingsManager...');
      
      // Load existing settings from storage
      await this.loadSettings();
      
      // Apply environment-specific overrides
      this.applyEnvironmentConfig();
      
      // Validate and fix any invalid settings
      await this.validateAndFixSettings();
      
      // Set up storage change listeners
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(this.boundStorageListener);
      }
      
      this.initialized = true;
      this.logger.info('SettingsManager initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize SettingsManager:', error);
      throw error;
    }
  }
  
  /**
   * Clean up resources and remove listeners
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (!this.initialized) return;
    
    try {
      // Remove storage listeners
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.removeListener(this.boundStorageListener);
      }
      
      // Clear internal state
      this.listeners.clear();
      this.settings = {};
      this.initialized = false;
      
      this.logger.info('SettingsManager cleaned up');
      
    } catch (error) {
      this.logger.error('Error during SettingsManager cleanup:', error);
    }
  }
  
  /**
   * Get a setting value by path
   * @param {string} path - Dot-separated path to setting (e.g., 'core.debugMode')
   * @param {*} defaultValue - Default value if setting not found
   * @returns {*} Setting value or default
   */
  get(path, defaultValue = undefined) {
    try {
      const value = this.getValueByPath(this.settings, path);
      
      if (value === undefined && defaultValue === undefined) {
        // Try to get default from schema
        const schemaDefault = this.getSchemaDefault(path);
        return schemaDefault !== undefined ? schemaDefault : defaultValue;
      }
      
      return value !== undefined ? value : defaultValue;
      
    } catch (error) {
      this.logger.error(`Error getting setting ${path}:`, error);
      return defaultValue;
    }
  }
  
  /**
   * Set a setting value by path
   * @param {string} path - Dot-separated path to setting
   * @param {*} value - Value to set
   * @param {boolean} [sync=true] - Whether to sync to storage immediately
   * @returns {Promise<boolean>} Success status
   */
  async set(path, value, sync = true) {
    try {
      // Validate the value against schema
      const validation = this.validateValue(path, value);
      if (!validation.isValid) {
        this.logger.warn(`Invalid value for ${path}:`, validation.errors);
        return false;
      }
      
      // Set the value
      const oldValue = this.get(path);
      this.setValueByPath(this.settings, path, value);
      
      // Sync to storage if requested
      if (sync && this.autoSync) {
        await this.saveSettings();
      }
      
      // Notify listeners
      this.notifyListeners(path, value, oldValue);
      
      this.logger.debug(`Setting ${path} updated:`, { oldValue, newValue: value });
      return true;
      
    } catch (error) {
      this.logger.error(`Error setting ${path}:`, error);
      return false;
    }
  }
  
  /**
   * Update multiple settings at once
   * @param {Object} updates - Object with path-value pairs
   * @param {boolean} [sync=true] - Whether to sync to storage immediately
   * @returns {Promise<Object>} Results object with success/failure for each update
   */
  async updateMultiple(updates, sync = true) {
    const results = {};
    
    try {
      // Process all updates
      for (const [path, value] of Object.entries(updates)) {
        results[path] = await this.set(path, value, false); // Don't sync individually
      }
      
      // Sync once at the end if requested
      if (sync && this.autoSync) {
        await this.saveSettings();
      }
      
      this.logger.info('Multiple settings updated:', results);
      return results;
      
    } catch (error) {
      this.logger.error('Error updating multiple settings:', error);
      return results;
    }
  }
  
  /**
   * Reset a setting to its default value
   * @param {string} path - Dot-separated path to setting
   * @param {boolean} [sync=true] - Whether to sync to storage immediately
   * @returns {Promise<boolean>} Success status
   */
  async reset(path, sync = true) {
    const defaultValue = this.getSchemaDefault(path);
    if (defaultValue === undefined) {
      this.logger.warn(`No default value found for setting: ${path}`);
      return false;
    }
    
    return await this.set(path, defaultValue, sync);
  }
  
  /**
   * Reset all settings to defaults
   * @param {boolean} [sync=true] - Whether to sync to storage immediately
   * @returns {Promise<void>}
   */
  async resetAll(sync = true) {
    try {
      this.logger.info('Resetting all settings to defaults...');
      
      this.settings = this.getDefaultSettings();
      this.applyEnvironmentConfig();
      
      if (sync && this.autoSync) {
        await this.saveSettings();
      }
      
      // Notify all listeners about the reset
      this.notifyAllListeners();
      
      this.logger.info('All settings reset to defaults');
      
    } catch (error) {
      this.logger.error('Error resetting all settings:', error);
      throw error;
    }
  }
  
  /**
   * Check if a feature is enabled
   * @param {string} featureName - Name of the feature
   * @returns {boolean} Whether the feature is enabled
   */
  isFeatureEnabled(featureName) {
    return this.get(`features.${featureName}`, false);
  }
  
  /**
   * Toggle a feature on/off
   * @param {string} featureName - Name of the feature
   * @param {boolean} [sync=true] - Whether to sync to storage immediately
   * @returns {Promise<boolean>} New state of the feature
   */
  async toggleFeature(featureName, sync = true) {
    const currentState = this.isFeatureEnabled(featureName);
    const newState = !currentState;
    
    await this.set(`features.${featureName}`, newState, sync);
    
    this.logger.info(`Feature ${featureName} toggled:`, { from: currentState, to: newState });
    return newState;
  }
  
  /**
   * Get all current settings
   * @returns {Object} Complete settings object
   */
  getAllSettings() {
    return JSON.parse(JSON.stringify(this.settings));
  }
  
  /**
   * Export settings for backup or sharing
   * @param {boolean} [includeEnvironmentOverrides=false] - Include environment-specific settings
   * @returns {Object} Exportable settings object
   */
  exportSettings(includeEnvironmentOverrides = false) {
    const exported = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: this.environment,
      settings: this.getAllSettings()
    };
    
    if (!includeEnvironmentOverrides) {
      // Remove environment-specific overrides to make export portable
      const envConfig = ENVIRONMENT_CONFIGS[this.environment];
      if (envConfig) {
        exported.settings = this.removeEnvironmentOverrides(exported.settings, envConfig);
      }
    }
    
    this.logger.info('Settings exported', { includeEnvironmentOverrides });
    return exported;
  }
  
  /**
   * Import settings from exported data
   * @param {Object} exportedData - Previously exported settings data
   * @param {boolean} [sync=true] - Whether to sync to storage immediately
   * @returns {Promise<boolean>} Success status
   */
  async importSettings(exportedData, sync = true) {
    try {
      if (!exportedData || !exportedData.settings) {
        throw new Error('Invalid exported data format');
      }
      
      this.logger.info('Importing settings...', { version: exportedData.version });
      
      // Validate imported settings
      const validation = this.validateSettings(exportedData.settings);
      if (!validation.isValid) {
        this.logger.warn('Some imported settings are invalid:', validation.errors);
        // Continue with valid settings, skip invalid ones
        exportedData.settings = validation.fixedSettings;
      }
      
      // Update settings
      this.settings = exportedData.settings;
      this.applyEnvironmentConfig();
      
      if (sync && this.autoSync) {
        await this.saveSettings();
      }
      
      // Notify all listeners about the import
      this.notifyAllListeners();
      
      this.logger.info('Settings imported successfully');
      return true;
      
    } catch (error) {
      this.logger.error('Error importing settings:', error);
      return false;
    }
  }
  
  /**
   * Add a listener for setting changes
   * @param {string} path - Setting path to listen to (or '*' for all changes)
   * @param {Function} callback - Callback function (newValue, oldValue, path) => void
   * @returns {Function} Unsubscribe function
   */
  addListener(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    
    this.listeners.get(path).add(callback);
    
    this.logger.debug(`Listener added for setting: ${path}`);
    
    return () => {
      const pathListeners = this.listeners.get(path);
      if (pathListeners) {
        pathListeners.delete(callback);
        if (pathListeners.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }
  
  /**
   * Get current environment
   * @returns {string} Current environment ('development', 'production', or 'testing')
   */
  getEnvironment() {
    return this.environment;
  }
  
  /**
   * Set environment and apply configuration
   * @param {string} environment - Environment to set
   * @returns {Promise<void>}
   */
  async setEnvironment(environment) {
    if (!ENVIRONMENT_CONFIGS[environment]) {
      throw new Error(`Unknown environment: ${environment}`);
    }
    
    const oldEnvironment = this.environment;
    this.environment = environment;
    
    this.applyEnvironmentConfig();
    
    if (this.autoSync) {
      await this.saveSettings();
    }
    
    this.logger.info(`Environment changed:`, { from: oldEnvironment, to: environment });
  }
  
  // Private helper methods
  
  /**
   * Detect current environment based on URL and other factors
   * @private
   */
  detectEnvironment() {
    try {
      const hostname = window.location?.hostname || '';
      
      if (hostname.includes('dev.spend.cloud') || hostname.includes('localhost')) {
        return 'development';
      } else if (hostname.includes('test.spend.cloud') || hostname.includes('staging')) {
        return 'testing';
      } else {
        return 'production';
      }
    } catch (error) {
      return 'production'; // Safe default
    }
  }
  
  /**
   * Load settings from Chrome storage
   * @private
   */
  async loadSettings() {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        this.logger.warn('Chrome storage not available, using defaults');
        this.settings = this.getDefaultSettings();
        return;
      }
      
      const result = await chrome.storage[this.storageArea].get('powerCloudSettings');
      
      if (result && result.powerCloudSettings && typeof result.powerCloudSettings === 'object') {
        this.settings = result.powerCloudSettings;
        this.logger.debug('Settings loaded from storage');
      } else {
        this.settings = this.getDefaultSettings();
        this.logger.info('No existing settings found, using defaults');
      }
      
    } catch (error) {
      this.logger.error('Error loading settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }
  
  /**
   * Save settings to Chrome storage
   * @private
   */
  async saveSettings() {
    if (this.syncInProgress) return;
    
    try {
      this.syncInProgress = true;
      
      if (typeof chrome === 'undefined' || !chrome.storage) {
        this.logger.warn('Chrome storage not available for saving');
        return;
      }
      
      await chrome.storage[this.storageArea].set({
        powerCloudSettings: this.settings
      });
      
      this.logger.debug('Settings saved to storage');
      
    } catch (error) {
      this.logger.error('Error saving settings:', error);
    } finally {
      this.syncInProgress = false;
    }
  }
  
  /**
   * Get default settings from schema
   * @private
   */
  getDefaultSettings() {
    const defaults = {};
    
    for (const [category, settings] of Object.entries(CONFIG_SCHEMA)) {
      defaults[category] = {};
      for (const [key, config] of Object.entries(settings)) {
        defaults[category][key] = config.default;
      }
    }
    
    return defaults;
  }
  
  /**
   * Apply environment-specific configuration overrides
   * @private
   */
  applyEnvironmentConfig() {
    const envConfig = ENVIRONMENT_CONFIGS[this.environment];
    if (!envConfig) return;
    
    this.logger.debug(`Applying ${this.environment} environment config`);
    
    for (const [category, settings] of Object.entries(envConfig)) {
      if (!this.settings[category]) {
        this.settings[category] = {};
      }
      
      Object.assign(this.settings[category], settings);
    }
  }
  
  /**
   * Handle Chrome storage change events
   * @private
   */
  handleStorageChange(changes, areaName) {
    if (areaName !== this.storageArea || this.syncInProgress) return;
    
    const settingsChange = changes.powerCloudSettings;
    if (settingsChange && settingsChange.newValue) {
      this.logger.debug('Settings changed externally, updating local copy');
      this.settings = settingsChange.newValue;
      this.notifyAllListeners();
    }
  }
  
  /**
   * Get value from object by dot-separated path
   * @private
   */
  getValueByPath(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  /**
   * Set value in object by dot-separated path
   * @private
   */
  setValueByPath(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }
  
  /**
   * Get default value from schema
   * @private
   */
  getSchemaDefault(path) {
    const [category, ...keyPath] = path.split('.');
    const categorySchema = CONFIG_SCHEMA[category];
    
    if (!categorySchema) return undefined;
    
    const key = keyPath.join('.');
    return categorySchema[key]?.default;
  }
  
  /**
   * Validate a value against schema
   * @private
   */
  validateValue(path, value) {
    const [category, ...keyPath] = path.split('.');
    const categorySchema = CONFIG_SCHEMA[category];
    
    if (!categorySchema) {
      return { isValid: false, errors: [`Unknown category: ${category}`] };
    }
    
    const key = keyPath.join('.');
    const schema = categorySchema[key];
    
    if (!schema) {
      return { isValid: false, errors: [`Unknown setting: ${path}`] };
    }
    
    const errors = [];
    
    // Type validation
    if (typeof value !== schema.type) {
      errors.push(`Expected ${schema.type}, got ${typeof value}`);
    }
    
    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`Value must be one of: ${schema.enum.join(', ')}`);
    }
    
    // Range validation for numbers
    if (schema.type === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        errors.push(`Value must be >= ${schema.min}`);
      }
      if (schema.max !== undefined && value > schema.max) {
        errors.push(`Value must be <= ${schema.max}`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * Validate all settings and fix invalid ones
   * @private
   */
  async validateAndFixSettings() {
    const validation = this.validateSettings(this.settings);
    
    if (!validation.isValid) {
      this.logger.warn('Some settings are invalid, fixing...', validation.errors);
      this.settings = validation.fixedSettings;
      
      if (this.autoSync) {
        await this.saveSettings();
      }
    }
  }
  
  /**
   * Validate settings object
   * @private
   */
  validateSettings(settings) {
    const errors = [];
    const fixedSettings = JSON.parse(JSON.stringify(settings));
    
    for (const [category, categorySettings] of Object.entries(CONFIG_SCHEMA)) {
      if (!fixedSettings[category]) {
        fixedSettings[category] = {};
      }
      
      for (const [key, schema] of Object.entries(categorySettings)) {
        const value = fixedSettings[category][key];
        const validation = this.validateValue(`${category}.${key}`, value);
        
        if (!validation.isValid) {
          errors.push(`${category}.${key}: ${validation.errors.join(', ')}`);
          fixedSettings[category][key] = schema.default;
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      fixedSettings
    };
  }
  
  /**
   * Notify listeners of setting changes
   * @private
   */
  notifyListeners(path, newValue, oldValue) {
    // Notify specific path listeners
    const pathListeners = this.listeners.get(path);
    if (pathListeners) {
      pathListeners.forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          this.logger.error('Error in setting listener:', error);
        }
      });
    }
    
    // Notify global listeners
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          this.logger.error('Error in global setting listener:', error);
        }
      });
    }
  }
  
  /**
   * Notify all listeners (used for reset/import operations)
   * @private
   */
  notifyAllListeners() {
    for (const [path, listeners] of this.listeners) {
      if (path === '*') continue; // Handle global listeners separately
      
      const currentValue = this.get(path);
      listeners.forEach(callback => {
        try {
          callback(currentValue, undefined, path);
        } catch (error) {
          this.logger.error('Error in setting listener:', error);
        }
      });
    }
    
    // Handle global listeners
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(callback => {
        try {
          callback(this.settings, undefined, '*');
        } catch (error) {
          this.logger.error('Error in global setting listener:', error);
        }
      });
    }
  }
  
  /**
   * Remove environment overrides from settings object
   * @private
   */
  removeEnvironmentOverrides(settings, envConfig) {
    const cleaned = JSON.parse(JSON.stringify(settings));
    
    for (const [category, envSettings] of Object.entries(envConfig)) {
      if (cleaned[category]) {
        for (const key of Object.keys(envSettings)) {
          // Reset to schema default instead of removing
          const schemaDefault = this.getSchemaDefault(`${category}.${key}`);
          if (schemaDefault !== undefined) {
            cleaned[category][key] = schemaDefault;
          }
        }
      }
    }
    
    return cleaned;
  }
}

// Make SettingsManager available globally for extension use
if (typeof window !== 'undefined') {
  window.SettingsManager = SettingsManager;
  window.PowerCloudSettingsManager = SettingsManager;
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsManager;
}
