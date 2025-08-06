const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const Logger = require('../utils/logger');
const ErrorHandler = require('../utils/errorHandler');

/**
 * Centralized file handling utilities for consistent file operations across commands
 */
class FileUtils {
  /**
   * Parse import file based on format
   * @param {string} filePath - File path
   * @param {Object} options - Command options
   * @returns {Array} - Parsed data
   */
  static parseImportFile(filePath, options) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      switch (options.format.toLowerCase()) {
        case 'json':
          return JSON.parse(fileContent);
        case 'jsonl':
          return fileContent.split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
        case 'csv':
          return this.parseCSV(fileContent);
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }
    } catch (error) {
      ErrorHandler.handleFileError(error, filePath, options);
    }
  }

  /**
   * Parse CSV content
   * @param {string} content - CSV content
   * @returns {Array} - Parsed data
   */
  static parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }

    return data;
  }

  /**
   * Convert data to CSV format
   * @param {Array} data - Data to convert
   * @returns {string} - CSV string
   */
  static convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  /**
   * Convert file to JSONL format for import
   * @param {string} filePath - File path
   * @param {string} objectType - Object type
   * @param {Object} options - Command options
   * @returns {string} - Path to JSONL file
   */
  static convertToJSONL(filePath, objectType, options) {
    try {
      const data = this.parseImportFile(filePath, options);
      
      // Create JSONL content with metadata header
      const jsonlContent = [
        `{"meta": {"objectname": "${objectType.toLowerCase()}"}}`,
        ...data.map(item => JSON.stringify(item))
      ].join('\n');
      
      // Write to temporary JSONL file
      const jsonlFile = filePath.replace(/\.[^.]+$/, '.jsonl');
      fs.writeFileSync(jsonlFile, jsonlContent);
      
      return jsonlFile;
    } catch (error) {
      ErrorHandler.handleFileError(error, filePath, options);
    }
  }

  /**
   * Convert exported JSONL file to import format
   * @param {string} filePath - File path
   * @param {string} objectType - Object type
   * @returns {string} - Path to converted file
   */
  static convertExportedFileToImportFormat(filePath, objectType) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('File is empty');
      }
      
      // Parse the first line to get the object name
      let objectName;
      try {
        const firstLine = JSON.parse(lines[0]);
        objectName = firstLine.meta_objectName || objectType.toLowerCase();
      } catch (error) {
        throw new Error('Invalid JSONL format in first line');
      }
      
      // Create the correct import format
      const importLines = [
        `{"meta": {"objectname": "${objectName.toLowerCase()}"}}`,
        ...lines.slice(1) // Skip the first line and use the rest as-is
      ];
      
      const importContent = importLines.join('\n');
      
      // Create a temporary file with the correct format
      const importFile = filePath.replace('.jsonl', '-import.jsonl');
      fs.writeFileSync(importFile, importContent);
      
      return importFile;
    } catch (error) {
      ErrorHandler.handleFileError(error, filePath, {});
    }
  }

  /**
   * Create form data for file upload
   * @param {string} filePath - File path
   * @param {string} fieldName - Form field name
   * @returns {FormData} - Form data object
   */
  static createFormData(filePath, fieldName) {
    const formData = new FormData();
    formData.append(fieldName, fs.createReadStream(filePath), path.basename(filePath));
    return formData;
  }

  /**
   * Create form data for multiple files
   * @param {Array} files - Array of file paths
   * @param {Function} getFieldName - Function to get field name for each file
   * @returns {FormData} - Form data object
   */
  static createMultiFileFormData(files, getFieldName) {
    const formData = new FormData();
    
    files.forEach(filePath => {
      const fileName = path.basename(filePath);
      const objectType = fileName.split('-')[0]; // Extract object type from filename
      const fieldName = getFieldName(objectType);
      
      if (fieldName) {
        formData.append(fieldName, fs.createReadStream(filePath), fileName);
        Logger.info(`Adding ${objectType} data from ${fileName}`);
      } else {
        Logger.warning(`Skipping ${fileName} - unknown object type: ${objectType}`);
      }
    });
    
    return formData;
  }

  /**
   * Write data to file or stdout
   * @param {any} data - Data to write
   * @param {string} outputPath - Output file path (optional)
   * @param {Object} options - Command options
   */
  static writeOutput(data, outputPath, options = {}) {
    if (outputPath) {
      // Write to file
      fs.writeFileSync(outputPath, data);
      Logger.success(`Data written to: ${outputPath}`);
    } else {
      // Output to stdout
      console.log(data);
    }
  }

  /**
   * Find downloaded files for an export job ID
   * @param {string} exportJobId - Export job ID
   * @param {string} objectType - Object type
   * @param {Object} options - Command options
   * @returns {Array} - Array of file paths
   */
  static findDownloadedFiles(exportJobId, objectType, options) {
    const files = [];
    const currentDir = process.cwd();
    
    // Look for files with the pattern: objecttype-jobid.jsonl
    const pattern = options.allObjects 
      ? `*-${exportJobId}.jsonl`
      : `${objectType.toLowerCase()}-${exportJobId}.jsonl`;
    
    try {
      const dirContents = fs.readdirSync(currentDir);
      const matchingFiles = dirContents.filter(file => {
        if (options.allObjects) {
          return file.match(new RegExp(`^.*-${exportJobId}\\.jsonl$`));
        } else {
          return file.toLowerCase() === `${objectType.toLowerCase()}-${exportJobId}.jsonl`;
        }
      });
      
      matchingFiles.forEach(file => {
        const filePath = path.join(currentDir, file);
        if (fs.existsSync(filePath)) {
          files.push(filePath);
        }
      });
    } catch (error) {
      Logger.error(`Error searching for downloaded files: ${error.message}`);
    }
    
    return files;
  }

  /**
   * Get file size in bytes
   * @param {string} filePath - File path
   * @returns {number} - File size in bytes
   */
  static getFileSize(filePath) {
    try {
      return fs.statSync(filePath).size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clean up temporary files
   * @param {Array} files - Array of file paths to clean up
   * @param {Object} options - Command options
   */
  static cleanupTempFiles(files, options) {
    if (!options.verbose) {
      files.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (error) {
            Logger.warning(`Failed to clean up temporary file: ${filePath}`);
          }
        }
      });
    }
  }
}

module.exports = FileUtils; 