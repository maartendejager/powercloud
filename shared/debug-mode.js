/**
 * Debug Mode Controller for PowerCloud Extension
 * 
 * Provides a comprehensive debug interface for development and troubleshooting.
 * Includes verbose logging, feature status monitoring, and diagnostic tools.
 */

/**
 * Debug Mode Controller
 * Manages debug functionality across the entire extension
 */
class DebugModeController {
  constructor() {
    this.isDebugEnabled = this.checkDebugMode();
    this.debugPanel = null;
    this.startTime = Date.now();
    
    // Initialize logger with improved fallback pattern
    this.logger = window.PowerCloudLoggerFactory?.getLogger('DebugMode') || 
      window.PowerCloudLoggerFactory?.createFallbackLogger('DebugMode');

    if (this.isDebugEnabled) {
      this.initializeDebugMode();
    }
  }

  /**
   * Check if debug mode should be enabled
   * @returns {boolean}
   */
  checkDebugMode() {
    // Check multiple sources for debug mode activation
    const urlParams = new URLSearchParams(window.location.search);
    const sessionDebug = sessionStorage.getItem('powercloud-debug');
    const localDebug = localStorage.getItem('powercloud-debug');
    
    return !!(
      urlParams.get('powercloud-debug') || 
      sessionDebug === 'true' || 
      localDebug === 'true' ||
      window.PowerCloudDebug === true
    );
  }

  /**
   * Initialize debug mode
   */
  initializeDebugMode() {
    this.logger.info('Debug mode enabled');
    
    // Set global debug flag
    window.PowerCloudDebug = true;
    
    // Configure logger for debug mode
    if (window.PowerCloudLoggerFactory) {
      window.PowerCloudLoggerFactory.setGlobalLevel('DEBUG');
      window.PowerCloudLoggerFactory.enableDebugMode(true);
    }
    
    // Add debug styles
    this.addDebugStyles();
    
    // Create debug panel
    this.createDebugPanel();
    
    // Add keyboard shortcuts
    this.addKeyboardShortcuts();
    
    // Monitor performance
    this.startPerformanceMonitoring();
    
    this.logger.info('Debug mode initialization complete');
  }

  /**
   * Add debug-specific CSS styles
   */
  addDebugStyles() {
    const styles = `
      #powercloud-debug-panel {
        position: fixed;
        top: 10px;
        right: 10px;
        width: 300px;
        max-height: 400px;
        background: rgba(0, 0, 0, 0.9);
        color: #00ff00;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        border: 1px solid #333;
        border-radius: 5px;
        z-index: 999999;
        overflow: hidden;
        display: none;
      }
      
      #powercloud-debug-panel.visible {
        display: block;
      }
      
      .debug-panel-header {
        background: #333;
        padding: 8px;
        border-bottom: 1px solid #555;
        cursor: move;
        user-select: none;
      }
      
      .debug-panel-content {
        padding: 10px;
        max-height: 350px;
        overflow-y: auto;
      }
      
      .debug-section {
        margin-bottom: 15px;
        border-bottom: 1px solid #333;
        padding-bottom: 10px;
      }
      
      .debug-section h4 {
        margin: 0 0 5px 0;
        color: #ffff00;
      }
      
      .debug-feature-status {
        margin: 2px 0;
      }
      
      .debug-feature-success {
        color: #00ff00;
      }
      
      .debug-feature-failed {
        color: #ff4444;
      }
      
      .debug-toggle-btn {
        position: fixed;
        top: 10px;
        right: 320px;
        background: rgba(0, 0, 0, 0.8);
        color: #00ff00;
        border: 1px solid #333;
        padding: 5px 10px;
        font-size: 12px;
        cursor: pointer;
        z-index: 999998;
        border-radius: 3px;
      }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }

  /**
   * Create the debug panel UI
   */
  createDebugPanel() {
    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'powercloud-debug-toggle';
    toggleBtn.className = 'debug-toggle-btn';
    toggleBtn.textContent = 'PC Debug';
    toggleBtn.onclick = () => this.toggleDebugPanel();
    document.body.appendChild(toggleBtn);

    // Create debug panel
    const panel = document.createElement('div');
    panel.id = 'powercloud-debug-panel';
    panel.innerHTML = `
      <div class="debug-panel-header">
        <strong>PowerCloud Debug Panel</strong>
        <span style="float: right; cursor: pointer;" onclick="this.parentElement.parentElement.classList.remove('visible')">×</span>
      </div>
      <div class="debug-panel-content" id="debug-panel-content">
        <div class="debug-section">
          <h4>Loading...</h4>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    this.debugPanel = panel;
    
    // Update panel content
    this.updateDebugPanel();
    
    // Refresh panel content every 2 seconds
    setInterval(() => this.updateDebugPanel(), 2000);
  }

  /**
   * Toggle debug panel visibility
   */
  toggleDebugPanel() {
    if (this.debugPanel) {
      this.debugPanel.classList.toggle('visible');
    }
  }

  /**
   * Update debug panel content
   */
  updateDebugPanel() {
    if (!this.debugPanel) return;
    
    const content = document.getElementById('debug-panel-content');
    if (!content) return;

    const uptime = Math.round((Date.now() - this.startTime) / 1000);
    const currentUrl = window.location.href;
    
    // Get feature status
    const featureManager = window.PowerCloudSafeFeatureManager;
    const statusReport = featureManager ? featureManager.getStatusReport() : { registered: [], failed: [], stats: {} };
    
    // Get logger stats
    const loggerStats = window.PowerCloudLoggerFactory ? window.PowerCloudLoggerFactory.getStats() : {};
    
    content.innerHTML = `
      <div class="debug-section">
        <h4>System Info</h4>
        <div>Uptime: ${uptime}s</div>
        <div>URL: ${currentUrl}</div>
        <div>Debug: ${this.isDebugEnabled ? 'ON' : 'OFF'}</div>
      </div>
      
      <div class="debug-section">
        <h4>Features (${statusReport.registered.length + statusReport.failed.length})</h4>
        ${statusReport.registered.map(name => 
          `<div class="debug-feature-status debug-feature-success">✓ ${name}</div>`
        ).join('')}
        ${statusReport.failed.map(name => 
          `<div class="debug-feature-status debug-feature-failed">✗ ${name}</div>`
        ).join('')}
      </div>
      
      <div class="debug-section">
        <h4>Logger Stats</h4>
        <div>Loggers: ${loggerStats.totalLoggers || 0}</div>
        <div>Level: ${loggerStats.globalLevel || 'INFO'}</div>
      </div>
      
      <div class="debug-section">
        <h4>Controls</h4>
        <button onclick="window.PowerCloudDebugController.exportDebugData()" style="margin: 2px; padding: 2px 6px; font-size: 11px;">Export Data</button>
        <button onclick="window.PowerCloudDebugController.clearLogs()" style="margin: 2px; padding: 2px 6px; font-size: 11px;">Clear Logs</button>
      </div>
    `;
  }

  /**
   * Add keyboard shortcuts for debug functions
   */
  addKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl + Shift + D to toggle debug panel
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyD') {
        event.preventDefault();
        this.toggleDebugPanel();
      }
      
      // Ctrl + Shift + L to export logs
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyL') {
        event.preventDefault();
        this.exportDebugData();
      }
    });
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    // Monitor for long-running tasks
    let lastActivity = Date.now();
    
    const checkPerformance = () => {
      const now = Date.now();
      const timeSinceLastCheck = now - lastActivity;
      
      if (timeSinceLastCheck > 5000) { // 5 second threshold
        this.logger.warn(`Long gap detected: ${timeSinceLastCheck}ms`);
      }
      
      lastActivity = now;
      setTimeout(checkPerformance, 1000);
    };
    
    checkPerformance();
  }

  /**
   * Export debug data for analysis
   */
  exportDebugData() {
    const debugData = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      uptime: Date.now() - this.startTime,
      features: window.PowerCloudSafeFeatureManager ? 
        window.PowerCloudSafeFeatureManager.getStatusReport() : {},
      loggerStats: window.PowerCloudLoggerFactory ? 
        window.PowerCloudLoggerFactory.getStats() : {},
      failedFeatures: JSON.parse(sessionStorage.getItem('powercloud-failed-features') || '[]'),
      userAgent: navigator.userAgent,
      performance: {
        memory: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        } : null
      }
    };
    
    const dataStr = JSON.stringify(debugData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `powercloud-debug-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    this.logger.info('Debug data exported');
  }

  /**
   * Clear all stored logs
   */
  clearLogs() {
    sessionStorage.removeItem('powercloud-failed-features');
    if (window.PowerCloudLoggerFactory && typeof window.PowerCloudLoggerFactory.clearLogs === 'function') {
      window.PowerCloudLoggerFactory.clearLogs();
    }
    this.logger.info('Logs cleared');
  }

  /**
   * Enable debug mode programmatically
   */
  static enableDebugMode() {
    sessionStorage.setItem('powercloud-debug', 'true');
    window.location.reload();
  }

  /**
   * Disable debug mode
   */
  static disableDebugMode() {
    sessionStorage.removeItem('powercloud-debug');
    localStorage.removeItem('powercloud-debug');
    window.location.reload();
  }
}

// Initialize debug mode controller
window.PowerCloudDebugController = new DebugModeController();
