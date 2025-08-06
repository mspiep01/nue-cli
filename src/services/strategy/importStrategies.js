const { isProductCatalogObjectType, isTransactionHubObjectType, getFormFieldName } = require('../objectTypes');
const { Logger, FileUtils, JobManager } = require('../../utils');

/**
 * Base strategy class for import operations
 */
class ImportStrategy {
  constructor(apiClient, options) {
    this.apiClient = apiClient;
    this.options = options;
  }

  async execute(objectType, file) {
    throw new Error('execute method must be implemented by subclass');
  }

  async waitForCompletion(jobId) {
    if (this.options.wait) {
      await JobManager.waitForImportCompletion(jobId, this.apiClient, this.options);
    } else {
      Logger.warning('Import job is running asynchronously. Use --wait to wait for completion.');
    }
  }
}

/**
 * Strategy for product catalog imports
 */
class ProductCatalogImportStrategy extends ImportStrategy {
  async execute(objectType, file) {
    // Convert file to JSONL format if needed
    const jsonlFile = FileUtils.convertToJSONL(file, objectType, this.options);
    
    // Create import job
    const importJobResponse = await this.apiClient.createProductCatalogImportJob(
      this.options.importOperation || 'upsert'
    );
    const jobId = importJobResponse.jobid;
    Logger.success(`Import job created with ID: ${jobId}`);

    // Upload file content using form data
    await this.uploadFile(jobId, jsonlFile, objectType);

    // Wait for completion if requested
    await this.waitForCompletion(jobId);
  }

  async uploadFile(jobId, file, objectType) {
    const fieldName = getFormFieldName(objectType);
    const formData = FileUtils.createFormData(file, fieldName);

    Logger.fileOperation('Uploading', file, { 
      showFullPath: false,
      fileSize: FileUtils.getFileSize(file)
    });
    
    Logger.verbose(`Form field name: ${fieldName}`, this.options);
    Logger.verbose(`File path: ${file}`, this.options);
    Logger.verbose(`File size: ${FileUtils.getFileSize(file)} bytes`, this.options);

    await this.apiClient.uploadImportFile(jobId, formData);
    Logger.success('File uploaded successfully');
  }
}

/**
 * Strategy for transaction imports
 */
class TransactionImportStrategy extends ImportStrategy {
  async execute(objectType, file) {
    // Create import job
    const importJobResponse = await this.apiClient.createImportJob({
      format: this.options.format,
      objectname: objectType.toLowerCase()
    });

    const jobId = importJobResponse.jobid;
    Logger.success(`Import job created with ID: ${jobId}`);

    // Upload file content
    await this.uploadFile(jobId, file);

    // Wait for completion if requested
    await this.waitForCompletion(jobId);
  }

  async uploadFile(jobId, file) {
    const formData = FileUtils.createFormData(file, 'data');
    await this.apiClient.uploadImportFile(jobId, formData);
    Logger.success('File uploaded successfully');
  }
}

/**
 * Strategy for transaction hub imports
 */
class TransactionHubImportStrategy extends ImportStrategy {
  async execute(objectType, file) {
    // Read and parse the import file
    const importData = FileUtils.parseImportFile(file, this.options);
    
    // Create import job
    const importJobResponse = await this.apiClient.createTransactionHubImportJob(importData);
    const jobId = importJobResponse.jobid;
    Logger.success(`Transaction hub import job created with ID: ${jobId}`);

    // Wait for completion if requested
    if (this.options.wait) {
      await JobManager.waitForTransactionHubImportCompletion(jobId, this.apiClient, this.options);
    } else {
      Logger.warning('Import job is running asynchronously. Use --wait to wait for completion.');
    }
  }
}

/**
 * Strategy for export job ID imports
 */
class ExportJobIdImportStrategy extends ImportStrategy {
  async execute(objectType, exportJobId) {
    Logger.info(`Importing from export job ID: ${exportJobId}`);
    
    // Find downloaded files for this export job
    const downloadedFiles = FileUtils.findDownloadedFiles(exportJobId, objectType, this.options);
    
    if (downloadedFiles.length === 0) {
      Logger.error(`No downloaded files found for export job ID: ${exportJobId}`);
      Logger.warning('Make sure you have run the export command with --download flag first');
      process.exit(1);
    }

    Logger.verbose('Found downloaded files:', this.options);
    downloadedFiles.forEach(file => {
      Logger.verbose(`  - ${file}`, this.options);
    });

    // Determine if this is a product catalog import
    const isProductCatalogObject = isProductCatalogObjectType(objectType);
    
    if (isProductCatalogObject || this.options.allObjects) {
      await this.importMultipleFiles(downloadedFiles);
    } else {
      await this.importSingleFile(downloadedFiles[0], objectType);
    }
  }

  async importMultipleFiles(files) {
    // Convert all files to import format
    const convertedFiles = files.map(file => {
      const fileName = require('path').basename(file);
      const fileObjectType = fileName.split('-')[0];
      return FileUtils.convertExportedFileToImportFormat(file, fileObjectType);
    });
    
    await this.importProductCatalogFromFiles(convertedFiles);
    
    // Clean up temporary files
    FileUtils.cleanupTempFiles(convertedFiles, this.options);
  }

  async importSingleFile(file, objectType) {
    // Single object import - convert the file to import format
    const convertedFile = FileUtils.convertExportedFileToImportFormat(file, objectType);
    
    await this.importProductCatalogDataDirect(convertedFile, objectType);
    
    // Clean up temporary file
    FileUtils.cleanupTempFiles([convertedFile], this.options);
  }

  async importProductCatalogFromFiles(files) {
    // Create form data with all files
    const formData = FileUtils.createMultiFileFormData(files, getFormFieldName);
    
    Logger.verbose(`Total files to upload: ${files.length}`, this.options);

    // Create import job and upload files in one request
    const response = await this.apiClient.post(
      `/cpq/async/imports/revenue-builder-data?import-operation=${this.options.importOperation || 'upsert'}`,
      formData,
      formData.getHeaders()
    );

    const jobId = response.jobId || response.jobid;
    Logger.success(`Import job created with ID: ${jobId}`);
    
    Logger.debug('API Response', response, this.options);

    await this.waitForCompletion(jobId);
  }

  async importProductCatalogDataDirect(file, objectType) {
    // Create form data with the file
    const fieldName = getFormFieldName(objectType);
    const formData = FileUtils.createFormData(file, fieldName);

    Logger.fileOperation('Uploading', file, { 
      showFullPath: false,
      fileSize: FileUtils.getFileSize(file)
    });
    
    Logger.verbose(`Form field name: ${fieldName}`, this.options);
    Logger.verbose(`File path: ${file}`, this.options);
    Logger.verbose(`File size: ${FileUtils.getFileSize(file)} bytes`, this.options);

    // Create import job and upload file in one request
    const response = await this.apiClient.post(
      `/cpq/async/imports/revenue-builder-data?import-operation=${this.options.importOperation || 'upsert'}`,
      formData,
      formData.getHeaders()
    );

    const jobId = response.jobId || response.jobid;
    Logger.success(`Import job created with ID: ${jobId}`);
    
    Logger.debug('API Response', response, this.options);

    await this.waitForCompletion(jobId);
  }
}

/**
 * Import strategy factory
 */
class ImportStrategyFactory {
  static createStrategy(objectType, options, apiClient) {
    // Handle export job ID imports first
    if (options.exportJobId) {
      return new ExportJobIdImportStrategy(apiClient, options);
    }

    // Handle different object types
    if (isProductCatalogObjectType(objectType)) {
      return new ProductCatalogImportStrategy(apiClient, options);
    } else if (isTransactionHubObjectType(objectType)) {
      return new TransactionHubImportStrategy(apiClient, options);
    } else {
      return new TransactionImportStrategy(apiClient, options);
    }
  }
}

module.exports = {
  ImportStrategy,
  ProductCatalogImportStrategy,
  TransactionImportStrategy,
  TransactionHubImportStrategy,
  ExportJobIdImportStrategy,
  ImportStrategyFactory
}; 