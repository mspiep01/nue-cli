const chalk = require('chalk');

/**
 * Centralized error handling utilities for consistent error reporting
 */
class ErrorHandler {
  /**
   * Handle API errors with consistent formatting
   * @param {Error} error - The error object
   * @param {Object} options - Command options
   * @param {string} context - Context for the error (e.g., "importing", "exporting")
   * @param {string} objectType - The object type being processed
   */
  static handleApiError(error, options, context, objectType) {
    console.error(chalk.red(`Error ${context} ${objectType}:`));
    
    if (error.response) {
      if (options.verbose) {
        console.error(chalk.red(`Status: ${error.response.status}`));
        console.error(chalk.red(JSON.stringify(error.response.data, null, 2)));
      } else {
        console.error(chalk.red(`Status: ${error.response.status}`));
        if (error.response.data && error.response.data.errors) {
          error.response.data.errors.forEach(err => {
            console.error(chalk.red(err.message));
          });
        } else if (error.response.data && error.response.data.error) {
          console.error(chalk.red(error.response.data.error));
        } else if (error.response.data && error.response.data.message) {
          console.error(chalk.red(error.response.data.message));
        }
      }
    } else {
      console.error(chalk.red(error.message));
    }
    
    process.exit(1);
  }

  /**
   * Handle validation errors
   * @param {string} message - Error message
   * @param {Object} options - Command options
   */
  static handleValidationError(message, options) {
    console.error(chalk.red(`Validation Error: ${message}`));
    if (options.verbose) {
      console.error(chalk.gray('Stack trace:'));
      console.error(chalk.gray(new Error().stack));
    }
    process.exit(1);
  }

  /**
   * Handle file-related errors
   * @param {Error} error - The error object
   * @param {string} filePath - The file path
   * @param {Object} options - Command options
   */
  static handleFileError(error, filePath, options) {
    console.error(chalk.red(`File Error: ${error.message}`));
    if (filePath) {
      console.error(chalk.red(`File: ${filePath}`));
    }
    if (options.verbose) {
      console.error(chalk.gray('Stack trace:'));
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }

  /**
   * Handle job failure with detailed error information
   * @param {Object} status - Job status object
   * @param {Object} options - Command options
   */
  static handleJobFailure(status, options) {
    console.error(chalk.red('✗ Job failed'));
    
    if (status.error) {
      console.error(chalk.red(`Error: ${status.error}`));
    }
    if (status.errorMessage) {
      console.error(chalk.red(`Error Message: ${status.errorMessage}`));
    }
    if (status.errorCode) {
      console.error(chalk.red(`Error Code: ${status.errorCode}`));
    }
    
    if (options.verbose) {
      console.log(chalk.gray('Full job status:'));
      console.log(chalk.gray(JSON.stringify(status, null, 2)));
    }
    
    throw new Error('Job failed');
  }
}

module.exports = ErrorHandler; 