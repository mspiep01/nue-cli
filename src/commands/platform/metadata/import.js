const chalk = require('chalk');
const fs = require('fs');
const { PlatformCommandBuilder } = require('../../../services/platform-command');
const { PlatformManager } = require('../../../services/platform-manager');
const { ApiClientFactory } = require('../../../clients/api-client-factory');
const { MetadataValidator } = require('../../../services/validators');
const { Logger } = require('../../../utils');

class ImportMetadataCommand {
  constructor() {
    this.builder = new PlatformCommandBuilder('platform', 'metadata', 'import');
  }

  register(program) {
    this.builder
      .addPlatformOptions()
      .addCommonOptions()
      .build(program)
      .action(this.handleAction.bind(this));
  }

  async handleAction(options) {
    try {
      // Handle download option
      if (options.download) {
        await this.handleDownload(options.download, options);
        return;
      }

      // Handle export job ID import
      if (options.exportJobId) {
        await this.handleExportJobIdImport(options);
        return;
      }

      console.log(chalk.blue('Importing metadata...'));

      // Validate input
      if (!options.file && !options.json) {
        throw new Error('Must specify --file, --json, or --export-job-id option');
      }

      // Parse metadata data
      const metadataData = await this.parseMetadataData(options);

      // Validate metadata structure
      MetadataValidator.validate(metadataData);

      // Setup API client
      const apiClient = await this.setupApiClient(options);
      const platformManager = new PlatformManager(apiClient);

      // Prepare import options
      const importOptions = {
        validateOnly: options.validateOnly || false,
        dryRun: options.dryRun || false,
        overwrite: options.overwrite || false,
        includeSchema: options.schema || false
      };

      if (options.verbose) {
        console.log(chalk.gray('Import options:'));
        console.log(chalk.gray(JSON.stringify(importOptions, null, 2)));
      }

      // Execute import
      const result = await platformManager.importMetadata(
        metadataData.objectType || 'all',
        metadataData,
        importOptions
      );

      // Handle job polling if --wait is specified
      if (options.wait && result.data && result.data.jobId) {
        await this.waitForJobCompletion(result.data.jobId, apiClient, options);
      } else {
        // Display results
        this.displayResults(result, options);
      }

    } catch (error) {
      console.error(chalk.red('Import failed:'), error.message);
      if (options.verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  }

  async parseMetadataData(options) {
    if (options.json) {
      return JSON.parse(options.json);
    } else if (options.file) {
      const fileContent = fs.readFileSync(options.file, 'utf8');
      return JSON.parse(fileContent);
    }
    throw new Error('Invalid data source');
  }

  async setupApiClient(options) {
    const { apiKey } = await this.builder.setupApi(options);
    
    // Use the old ApiClient for imports as it handles form data correctly
    const ApiClient = require('../../../utils/apiClient');
    return new ApiClient(apiKey, { 
      sandbox: options.sandbox,
      verbose: options.verbose
    });
  }

  async handleExportJobIdImport(options) {
    Logger.info(`Importing from export job ID: ${options.exportJobId}`);
    
    // Find downloaded files for this export job
    const FileUtils = require('../../../utils/fileUtils');
    const downloadedFiles = FileUtils.findDownloadedFiles(options.exportJobId, options.objectType, options);
    
    if (downloadedFiles.length === 0) {
      Logger.error(`No downloaded files found for export job ID: ${options.exportJobId}`);
      Logger.warning('Make sure you have run the export command with --download flag first');
      process.exit(1);
    }

    Logger.verbose('Found downloaded files:', options);
    downloadedFiles.forEach(file => {
      Logger.verbose(`  - ${file}`, options);
    });

    // Setup API client
    const apiClient = await this.setupApiClient(options);

    // Determine if this is a product catalog import
    const isProductCatalogObject = this.isProductCatalogObjectType(options.objectType);
    
    if (isProductCatalogObject || options.allObjects) {
      await this.importMultipleFiles(downloadedFiles, apiClient, options);
    } else {
      await this.importSingleFile(downloadedFiles[0], options.objectType, apiClient, options);
    }
  }

  isProductCatalogObjectType(objectType) {
    const productCatalogObjects = [
      'uom', 'credittype', 'creditpool', 'creditconversion', 'pricebook', 
      'pricetag', 'productgroup', 'product', 'bundle', 'bundlesuite', 'customsetting'
    ];
    return productCatalogObjects.includes(objectType?.toLowerCase());
  }

  async importMultipleFiles(files, apiClient, options) {
    // Convert all files to import format
    const FileUtils = require('../../../utils/fileUtils');
    const convertedFiles = files.map(file => {
      const fileName = require('path').basename(file);
      const fileObjectType = fileName.split('-')[0];
      return FileUtils.convertExportedFileToImportFormat(file, fileObjectType);
    });
    
    await this.importProductCatalogFromFiles(convertedFiles, apiClient, options);
    
    // Clean up temporary files
    FileUtils.cleanupTempFiles(convertedFiles, options);
  }

  async importSingleFile(file, objectType, apiClient, options) {
    // Single object import - convert the file to import format
    const FileUtils = require('../../../utils/fileUtils');
    const convertedFile = FileUtils.convertExportedFileToImportFormat(file, objectType);
    
    await this.importProductCatalogDataDirect(convertedFile, objectType, apiClient, options);
    
    // Clean up temporary file
    FileUtils.cleanupTempFiles([convertedFile], options);
  }

  async importProductCatalogFromFiles(files, apiClient, options) {
    // Create form data with all files
    const FileUtils = require('../../../utils/fileUtils');
    const formData = FileUtils.createMultiFileFormData(files, this.getFormFieldName);
    
    Logger.verbose(`Total files to upload: ${files.length}`, options);

    // Create import job and upload files in one request
    const response = await apiClient.post(
      `/cpq/async/imports/revenue-builder-data?import-operation=${options.importOperation || 'upsert'}`,
      formData,
      formData.getHeaders()
    );

    const jobId = response.jobId || response.jobid;
    Logger.success(`Import job created with ID: ${jobId}`);
    
    Logger.debug('API Response', response, options);

    await this.waitForJobCompletion(jobId, apiClient, options);
  }

  async importProductCatalogDataDirect(file, objectType, apiClient, options) {
    // Create form data with the file
    const FileUtils = require('../../../utils/fileUtils');
    const fieldName = this.getFormFieldName(objectType);
    const formData = FileUtils.createFormData(file, fieldName);

    Logger.fileOperation('Uploading', file, { 
      showFullPath: false,
      fileSize: FileUtils.getFileSize(file)
    });
    
    Logger.verbose(`Form field name: ${fieldName}`, options);
    Logger.verbose(`File path: ${file}`, options);
    Logger.verbose(`File size: ${FileUtils.getFileSize(file)} bytes`, options);

    // Create import job and upload file in one request
    const response = await apiClient.post(
      `/cpq/async/imports/revenue-builder-data?import-operation=${options.importOperation || 'upsert'}`,
      formData,
      formData.getHeaders()
    );

    const jobId = response.jobId || response.jobid;
    Logger.success(`Import job created with ID: ${jobId}`);
    
    Logger.debug('API Response', response, options);

    await this.waitForJobCompletion(jobId, apiClient, options);
  }

  getFormFieldName(objectType) {
    const fieldMap = {
      'uom': 'uom',
      'credittype': 'creditType',
      'creditpool': 'creditPool',
      'creditconversion': 'creditConversion',
      'pricebook': 'priceBook',
      'pricetag': 'priceTag',
      'productgroup': 'productGroup',
      'product': 'product',
      'bundle': 'bundle',
      'bundlesuite': 'bundleSuite',
      'customsetting': 'customSetting'
    };
    return fieldMap[objectType?.toLowerCase()] || objectType?.toLowerCase();
  }

  async waitForJobCompletion(jobId, apiClient, options) {
    Logger.progress('Waiting for import job completion...');
    
    const startTime = Date.now();
    const pollingInterval = 5000; // 5 seconds
    const maxPollingTime = 3600000; // 1 hour

    while (true) {
      try {
        const status = await apiClient.get(`/cpq/async/imports/revenue-builder-data/${jobId}`);
        
        Logger.debug('Status Response', status, options);
        
        // Check for terminal states (case-insensitive)
        const statusLower = status.status.toLowerCase();
        
        if (statusLower === 'completed' || statusLower === 'succeeded') {
          Logger.success('Import job completed successfully!');
          this.displayImportJobResults(status, options);
          return;
        }
        
        if (statusLower === 'failed') {
          // Check if we have any completed or partial completed import jobs
          const importJobs = status.importJobs || [];
          const hasPartialSuccess = importJobs.some(job => 
            job.status === 'PartialCompleted' || job.status === 'Completed'
          );
          
          if (hasPartialSuccess) {
            Logger.warning('Import job completed with partial success');
            this.displayImportJobResults(status, options);
            return;
          } else {
            throw new Error(`Import job ${jobId} failed: ${status.error || 'Unknown error'}`);
          }
        }
        
        if (statusLower === 'partialcompleted') {
          Logger.warning('Import job completed with partial success');
          this.displayImportJobResults(status, options);
          return;
        }
        
        // Show job status for processing
        Logger.jobStatus(status.status);
        
        // Check if we've exceeded the maximum polling time
        if (Date.now() - startTime > maxPollingTime) {
          throw new Error(`Import job ${jobId} timed out after ${maxPollingTime / 1000} seconds`);
        }
        
        // Wait before polling again
        await this.sleep(pollingInterval);
        
      } catch (error) {
        if (error.message.includes('Import job') && (error.message.includes('failed') || error.message.includes('cancelled') || error.message.includes('timed out'))) {
          throw error;
        }
        Logger.warning(`Could not check job status: ${error.message}`);
        await this.sleep(pollingInterval);
      }
    }
  }

  displayImportJobResults(status, options) {
    const importJobs = status.importJobs || [];
    
    if (importJobs.length === 0) {
      Logger.info('No import jobs found in status');
      return;
    }

    Logger.info('Import Results:');
    
    for (const importJob of importJobs) {
      Logger.info(`\n${importJob.objectName}:`);
      
      if (importJob.status === 'Completed') {
        Logger.success(`  ✓ Completed successfully`);
      } else if (importJob.status === 'PartialCompleted') {
        Logger.warning(`  ⚠ Partial success`);
        
        // Display stage details
        const stages = importJob.stages || [];
        for (const stage of stages) {
          Logger.info(`    Stage: ${stage.name}`);
          
          if (stage.detailInfo) {
            const detail = stage.detailInfo;
            Logger.info(`      Records processed: ${detail.numberRecordsProcessed}`);
            Logger.info(`      Records failed: ${detail.numberRecordsFailed}`);
            Logger.info(`      Processing time: ${detail.totalProcessingTime}ms`);
            
            if (detail.salesforceJobId) {
              Logger.info(`      Salesforce Job ID: ${detail.salesforceJobId}`);
            }
            
            // Show download links
            if (stage.dataFileUrl) {
              Logger.info(`      Data file: ${stage.dataFileUrl}`);
            }
            
            if (detail.failedRecordsUrl) {
              Logger.warning(`      Failed records: ${detail.failedRecordsUrl}`);
            }
          }
        }
      } else if (importJob.status === 'Failed') {
        Logger.error(`  ✗ Failed`);
        if (importJob.error) {
          Logger.error(`    Error: ${importJob.error}`);
        }
      } else {
        Logger.info(`  Status: ${importJob.status}`);
      }
    }
  }

  async handleDownload(jobId, options) {
    console.log(chalk.blue(`Downloading results for job ${jobId}...`));
    
    const apiClient = await this.setupApiClient(options);
    await this.downloadJobResults(jobId, apiClient, options);
  }

  async downloadJobResults(jobId, apiClient, options) {
    try {
      const result = await apiClient.get(`/jobs/${jobId}/download`, {
        format: options.format || 'json'
      });
      
      if (options.output) {
        const fs = require('fs');
        fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
        console.log(chalk.green(`Results saved to: ${options.output}`));
      } else {
        this.displayResults({ data: result }, options);
      }
    } catch (error) {
      console.error(chalk.red(`Failed to download job results: ${error.message}`));
      throw error;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  displayResults(result, options) {
    if (options.verbose) {
      console.log(chalk.green('Metadata import completed!'));
      console.log(chalk.green('Response data:'));
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green('Metadata import completed!'));
      
      if (result.data && result.data.imported) {
        console.log(chalk.blue(`Imported ${result.data.imported} objects`));
      }
      
      if (result.data && result.data.errors && result.data.errors.length > 0) {
        console.log(chalk.yellow(`Warnings: ${result.data.errors.length} issues found`));
      }
      
      if (result.data && result.data.schema) {
        console.log(chalk.blue('Schema updated'));
      }
    }

    // Show validation results if validate-only
    if (options.validateOnly) {
      console.log(chalk.blue('Validation completed - no changes made'));
    }
    
    if (result.data && result.data.jobId) {
      console.log(chalk.blue(`Job ID: ${result.data.jobId}`));
      console.log(chalk.blue('Use --wait to poll for completion or --download <jobId> to download results'));
    }
  }
}

module.exports = ImportMetadataCommand; 