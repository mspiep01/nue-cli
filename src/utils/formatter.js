const chalk = require('chalk');

/**
 * Utility class for formatting query results
 */
class Formatter {
  /**
   * Format data as pretty-printed output
   * @param {Array} data - Array of objects to format
   * @param {string} objectType - Type of object being formatted
   * @returns {string} - Formatted string
   */
  static formatPretty(data, objectType) {
    if (!data || data.length === 0) {
      return chalk.yellow(`No ${objectType} data found.`);
    }

    const result = [];
    result.push(chalk.green(`${objectType.charAt(0).toUpperCase() + objectType.slice(1)}s retrieved successfully!`));
    result.push(chalk.green(`\nFound ${data.length} ${objectType}${data.length === 1 ? '' : 's'}:`));

    data.forEach((item, index) => {
      result.push(chalk.green(`\n${objectType.charAt(0).toUpperCase() + objectType.slice(1)} #${index + 1}:`));
      result.push(chalk.green('---------------------------'));
      
      // Format each field
      Object.entries(item).forEach(([key, value]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const formattedValue = value === null || value === undefined ? 'N/A' : String(value);
        result.push(chalk.cyan(`${formattedKey.padEnd(20)}`) + formattedValue);
      });
      
      result.push(chalk.green('---------------------------'));
    });

    return result.join('\n');
  }

  /**
   * Format data as JSON
   * @param {Array} data - Array of objects to format
   * @param {boolean} pretty - Whether to pretty-print JSON
   * @returns {string} - JSON string
   */
  static formatJSON(data, pretty = true) {
    if (pretty) {
      return JSON.stringify(data, null, 2);
    }
    return JSON.stringify(data);
  }

  /**
   * Format data as CSV
   * @param {Array} data - Array of objects to format
   * @returns {string} - CSV string
   */
  static formatCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Format data as JSONL (JSON Lines)
   * @param {Array} data - Array of objects to format
   * @returns {string} - JSONL string
   */
  static formatJSONL(data) {
    if (!data || data.length === 0) return '';
    return data.map(item => JSON.stringify(item)).join('\n');
  }
}

module.exports = { Formatter }; 