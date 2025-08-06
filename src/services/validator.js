const fs = require('fs');
const path = require('path');
const { isValidObjectType, getValidObjectTypesList } = require('./objectTypes');
const ErrorHandler = require('../utils/errorHandler');

/**
 * Centralized validation utilities for consistent validation across commands
 */
class Validator {
  /**
   * Validate object type
   * @param {string} objectType - Object type to validate
   * @param {Object} options - Command options
   */
  static validateObjectType(objectType, options) {
    if (!isValidObjectType(objectType)) {
      ErrorHandler.handleValidationError(
        `Invalid object type '${objectType}'. Valid types are: ${getValidObjectTypesList()}`,
        options
      );
    }
  }

  /**
   * Validate file exists
   * @param {string} filePath - File path to validate
   * @param {Object} options - Command options
   */
  static validateFileExists(filePath, options) {
    if (!filePath) {
      ErrorHandler.handleValidationError('File path is required', options);
    }

    if (!fs.existsSync(filePath)) {
      ErrorHandler.handleValidationError(`File '${filePath}' does not exist`, options);
    }
  }

  /**
   * Validate file format
   * @param {string} filePath - File path
   * @param {string} expectedFormat - Expected format
   * @param {Object} options - Command options
   */
  static validateFileFormat(filePath, expectedFormat, options) {
    const fileExtension = path.extname(filePath).toLowerCase();
    const formatMap = {
      'json': ['.json'],
      'jsonl': ['.jsonl', '.json'],
      'csv': ['.csv']
    };

    const validExtensions = formatMap[expectedFormat.toLowerCase()] || [];
    if (!validExtensions.includes(fileExtension)) {
      ErrorHandler.handleValidationError(
        `File format '${fileExtension}' does not match specified format '${expectedFormat}'`,
        options
      );
    }
  }

  /**
   * Validate API key
   * @param {string} apiKey - API key to validate
   * @param {Object} options - Command options
   */
  static validateApiKey(apiKey, options) {
    if (!apiKey) {
      ErrorHandler.handleValidationError('API key is required', options);
    }
  }

  /**
   * Validate job ID
   * @param {string} jobId - Job ID to validate
   * @param {Object} options - Command options
   */
  static validateJobId(jobId, options) {
    if (!jobId) {
      ErrorHandler.handleValidationError('Job ID is required', options);
    }
  }

  /**
   * Validate date filter format
   * @param {string} dateFilter - Date filter string
   * @param {Object} options - Command options
   */
  static validateDateFilter(dateFilter, options) {
    if (!dateFilter) return;

    // Check if it's already an ISO date
    if (dateFilter.match(/^\d{4}-\d{2}-\d{2}/)) {
      return;
    }

    // Handle relative dates like "1 day ago"
    const parts = dateFilter.toLowerCase().split(' ');

    if (parts.length < 3) {
      ErrorHandler.handleValidationError(
        'Invalid date format. Use ISO format or relative like "1 day ago"',
        options
      );
    }

    const amount = parseInt(parts[0]);
    const unit = parts[1];
    const direction = parts[2];

    if (isNaN(amount)) {
      ErrorHandler.handleValidationError('Invalid number in date filter', options);
    }

    if (direction !== 'ago' && direction !== 'from' && direction !== 'now') {
      ErrorHandler.handleValidationError('Invalid direction. Use "ago" or "from now"', options);
    }

    const validUnits = ['day', 'days', 'month', 'months', 'quarter', 'quarters', 'year', 'years'];
    if (!validUnits.includes(unit)) {
      ErrorHandler.handleValidationError(
        'Invalid time unit. Use day(s), month(s), quarter(s), or year(s)',
        options
      );
    }
  }

  /**
   * Validate transaction hub data
   * @param {Array} data - Import data
   * @param {Object} options - Command options
   */
  static validateTransactionHubData(data, options) {
    if (!Array.isArray(data)) {
      ErrorHandler.handleValidationError('Transaction hub import data must be an array', options);
    }

    if (data.length === 0) {
      ErrorHandler.handleValidationError('Transaction hub import data cannot be empty', options);
    }

    if (data.length > 5000) {
      ErrorHandler.handleValidationError('Transaction hub import data cannot exceed 5000 records', options);
    }

    const requiredFields = ['transactiontype', 'nueid', 'externalsystem', 'externalsystemid', 'externalid'];
    data.forEach((record, index) => {
      // Check required fields
      requiredFields.forEach(field => {
        if (!record[field]) {
          ErrorHandler.handleValidationError(
            `Record ${index + 1} is missing required field: ${field}`,
            options
          );
        }
      });

      // Validate transaction type
      const { isValidTransactionType } = require('./objectTypes');
      if (!isValidTransactionType(record.transactiontype)) {
        ErrorHandler.handleValidationError(
          `Record ${index + 1} has invalid transaction type: ${record.transactiontype}`,
          options
        );
      }

      // Validate direction
      if (record.direction && !['inbound', 'outbound'].includes(record.direction.toLowerCase())) {
        ErrorHandler.handleValidationError(
          `Record ${index + 1} has invalid direction: ${record.direction}`,
          options
        );
      }
    });
  }

  /**
   * Validate export job ID format
   * @param {string} exportJobId - Export job ID
   * @param {Object} options - Command options
   */
  static validateExportJobId(exportJobId, options) {
    if (!exportJobId) {
      ErrorHandler.handleValidationError('Export job ID is required', options);
    }

    // Basic format validation - can be enhanced based on actual format
    if (typeof exportJobId !== 'string' || exportJobId.trim().length === 0) {
      ErrorHandler.handleValidationError('Export job ID must be a non-empty string', options);
    }
  }
}

module.exports = Validator; 