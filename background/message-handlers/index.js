/**
 * Message Handlers Index
 * 
 * Exports all message handlers for use in the service worker.
 */

export { 
  handleGetAuthTokens, 
  handleDeleteToken, 
  handleDeleteAllTokens 
} from './token-handlers.js';

export { 
  handleFetchCardDetails, 
  handleFetchBookDetails,
  handleFetchAdministrationDetails,
  handleFetchBalanceAccountDetails,
  handleFetchEntryDetails
} from './entity-handlers.js';

export {
  // Core health monitoring
  handleGetExtensionHealth,
  handleGetFeatureStatus,
  handleGetPerformanceMetrics,
  handleGetDebugLogs,
  handleGetErrorReports,
  handleClearDebugData,
  handleExportHealthReport,
  handleUpdateFeatureHealth,
  handleRecordPerformanceMetric,
  
  // Phase 2.1 enhanced API
  handleGetFilteredLogs,
  handleGetFeatureChannels,
  handleGetPerformanceSummary,
  handleUpdatePerformanceThresholds,
  handleRecordStructuredLog,
  handleRecordFeatureEvent,
  
  // Utility functions
  initializeHealthMonitoring,
  recordDebugLog,
  recordErrorReport,
  updateFeatureStatus,
  recordPerformanceMetric,
  recordStructuredLog,
  recordFeatureEvent,
  recordEnhancedPerformanceMetric
} from './health-handlers.js';
