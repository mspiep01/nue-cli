const chalk = require('chalk');

/**
 * Centralized logging utilities for consistent console output
 */
class Logger {
  /**
   * Log informational message
   * @param {string} message - Message to log
   * @param {Object} options - Command options
   */
  static info(message, options = {}) {
    console.log(chalk.blue(message));
  }

  /**
   * Log success message
   * @param {string} message - Message to log
   */
  static success(message) {
    console.log(chalk.green(`✓ ${message}`));
  }

  /**
   * Log warning message
   * @param {string} message - Message to log
   */
  static warning(message) {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  /**
   * Log error message
   * @param {string} message - Message to log
   */
  static error(message) {
    console.error(chalk.red(`❌ ${message}`));
  }

  /**
   * Log verbose message (only if verbose mode is enabled)
   * @param {string} message - Message to log
   * @param {Object} options - Command options
   */
  static verbose(message, options = {}) {
    if (options.verbose) {
      console.log(chalk.gray(message));
    }
  }

  /**
   * Log debug information (only if verbose mode is enabled)
   * @param {string} label - Label for the debug info
   * @param {any} data - Data to log
   * @param {Object} options - Command options
   */
  static debug(label, data, options = {}) {
    if (options.verbose) {
      console.log(chalk.gray(`${label}:`));
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  /**
   * Log job status
   * @param {string} status - Job status
   */
  static jobStatus(status) {
    console.log(chalk.yellow(`Job status: ${status}`));
  }

  /**
   * Log progress information
   * @param {string} message - Progress message
   */
  static progress(message) {
    console.log(chalk.blue(message));
  }

  /**
   * Log summary information
   * @param {string} title - Summary title
   * @param {Object} data - Summary data
   */
  static summary(title, data) {
    console.log(chalk.blue(`\n${title}:`));
    Object.entries(data).forEach(([key, value]) => {
      const color = key.toLowerCase().includes('success') || key.toLowerCase().includes('completed') 
        ? chalk.green 
        : key.toLowerCase().includes('failed') || key.toLowerCase().includes('error')
        ? chalk.red
        : chalk.blue;
      console.log(color(`  ${key}: ${value}`));
    });
  }

  /**
   * Log file operation information
   * @param {string} operation - Operation being performed
   * @param {string} filePath - File path
   * @param {Object} options - Additional options
   */
  static fileOperation(operation, filePath, options = {}) {
    const fileName = options.showFullPath ? filePath : require('path').basename(filePath);
    console.log(chalk.blue(`  ${operation} ${fileName}`));
    
    if (options.fileSize) {
      Logger.verbose(`  File size: ${options.fileSize} bytes`);
    }
  }
}

module.exports = Logger; 