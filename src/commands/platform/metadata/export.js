const chalk = require('chalk');
const { PlatformCommandBuilder } = require('../../../services/platform-command');
const { PlatformManager } = require('../../../services/platform-manager');
const { ApiClientFactory } = require('../../../clients/api-client-factory');
const { MetadataValidator } = require('../../../services/validators');
const { Logger } = require('../../../utils');

class ExportMetadataCommand {
  constructor() {
    this.builder = new PlatformCommandBuilder('platform', 'metadata', 'export');
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

      console.log(chalk.blue('Exporting metadata...'));

      // Validate input
      if (!options.objectType && !options.all) {
        throw new Error('Must specify --object-type or --all flag');
      }

      // Setup API client
      const apiClient = await this.setupApiClient(options);
      const platformManager = new PlatformManager(apiClient);

      // Prepare export options
      const exportOptions = {
        format: options.format || 'json',
        includeSchema: options.schema || false,
        includeMetadata: options.metadata || true,
        filters: options.filters ? JSON.parse(options.filters) : {}
      };

      let result;
      if (options.all) {
        // Export all metadata
        result = await platformManager.exportAllMetadata(exportOptions);
      } else {
        // Export specific object type
        result = await platformManager.exportMetadata(options.objectType, exportOptions);
      }

      // Handle job polling if --wait is specified
      if (options.wait && result.jobId) {
        await this.waitForJobCompletion(result.jobId, apiClient, options);
      } else {
        // Display results
        this.displayResults(result, options);
      }

    } catch (error) {
      console.error(chalk.red('Export failed:'), error.message);
      if (options.verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  }

  async setupApiClient(options) {
    const { apiKey } = await this.builder.setupApi(options);
    return ApiClientFactory.createClient('platform', 'rest', { 
      apiKey,
      sandbox: options.sandbox 
    });
  }

  async waitForJobCompletion(jobId, apiClient, options) {
    Logger.progress('Waiting for job completion...');
    
    const startTime = Date.now();
    const pollingInterval = 5000; // 5 seconds
    const maxPollingTime = 3600000; // 1 hour

    while (true) {
      try {
        const status = await apiClient.get(`/cpq/async/exports/${jobId}`);
        
        Logger.debug('Status Response', status, options);
        
        // Check for terminal states (case-insensitive)
        const statusLower = status.status.toLowerCase();
        
        if (statusLower === 'completed' || statusLower === 'succeeded') {
          Logger.success('Export job completed successfully!');
          
          // Download results if available
          if (status.objects && status.objects.length > 0) {
            await this.downloadJobResults(status, options, jobId);
          }
          return;
        }
        
        if (statusLower === 'failed') {
          // Check if we have any completed objects - if so, show partial success
          const completedObjects = status.objects?.filter(obj => obj.status === 'Completed') || [];
          const noRecordsObjects = status.objects?.filter(obj => 
            obj.status === 'Failed' && 
            obj.totalSize === 0 && 
            obj.errors && 
            obj.errors.some(error => error.includes('No ') && error.includes(' fetched'))
          ) || [];
          
          if (completedObjects.length > 0 || noRecordsObjects.length > 0) {
            Logger.success('Export job completed with partial success');
            await this.downloadJobResults(status, options, jobId);
            return;
          } else {
            throw new Error(`Job ${jobId} failed: ${status.error || 'Unknown error'}`);
          }
        }
        
        // Show job status for processing
        Logger.jobStatus(status.status);
        
        // Check if we've exceeded the maximum polling time
        if (Date.now() - startTime > maxPollingTime) {
          throw new Error(`Job ${jobId} timed out after ${maxPollingTime / 1000} seconds`);
        }
        
        // Wait before polling again
        await this.sleep(pollingInterval);
        
      } catch (error) {
        if (error.message.includes('Job') && (error.message.includes('failed') || error.message.includes('cancelled') || error.message.includes('timed out'))) {
          throw error;
        }
        Logger.warning(`Could not check job status: ${error.message}`);
        await this.sleep(pollingInterval);
      }
    }
  }

  async handleDownload(jobId, options) {
    Logger.info(`Checking status of export job ${jobId}...`);
    
    const apiClient = await this.setupApiClient(options);
    const status = await apiClient.get(`/cpq/async/exports/${jobId}`);
    
    if (status.status === 'Processing') {
      Logger.warning('Job is still processing. Please wait and try again.');
      process.exit(1);
    }
    
    if (status.status === 'Failed' && (!status.objects || status.objects.filter(obj => obj.status === 'Completed').length === 0)) {
      Logger.error('Job failed completely. No results available.');
      process.exit(1);
    }
    
    // Add objectType to options for filtering
    if (options.objectType) {
      options.objectType = options.objectType.toLowerCase();
    }
    
    // Download results with jobId included
    await this.downloadJobResults(status, options, jobId);
  }

    async downloadJobResults(status, options, jobId) {
    if (!status.objects || status.objects.length === 0) {
      Logger.warning('No export results available');
      return;
    }

    const requestedObjectType = options.objectType?.toLowerCase();
    
    // Filter out Usage objects since they have format issues
    const validObjects = status.objects.filter(obj => obj.name !== 'Usage');
    
    // Count completed objects to determine if we need individual file naming
    const completedObjects = validObjects.filter(obj => 
      obj.status === 'Completed' && obj.fileUrls && obj.fileUrls.length > 0
    );
    
    // Always use individual files when we have multiple objects, regardless of output option
    const needsIndividualFiles = completedObjects.length > 1;
    
    for (const obj of validObjects) {
      const objName = obj.name?.toLowerCase();
      
      // Only download if this is the requested object type, or if no specific object type was requested
      if (requestedObjectType && objName !== requestedObjectType) {
        continue;
      }
      
      if (obj.status === 'Completed' && obj.fileUrls && obj.fileUrls.length > 0) {
        Logger.info(`Downloading ${obj.name} data...`);
        
        try {
          const data = await this.downloadFileFromUrl(obj.fileUrls[0]);
          
          let outputPath = options.output;
          
          // If we have multiple objects, create individual files with proper naming
          if (needsIndividualFiles) {
            const actualJobId = jobId || options.jobId || 'unknown';
            const extension = options.output ? require('path').extname(options.output) : '.jsonl';
            const baseExtension = extension || '.jsonl';
            
            if (options.output) {
              // If output path is specified, create files in the same directory
              const dir = require('path').dirname(options.output);
              const baseName = require('path').basename(options.output, baseExtension);
              outputPath = require('path').join(dir, `${obj.name.toLowerCase()}-${actualJobId}${baseExtension}`);
            } else {
              // If no output path, create files in current directory
              outputPath = `${obj.name.toLowerCase()}-${actualJobId}${baseExtension}`;
            }
          }
          
          // Use FileUtils for consistent file handling
          const FileUtils = require('../../../utils/fileUtils');
          FileUtils.writeOutput(data, outputPath, options);
          Logger.success(`Downloaded ${obj.name} data (${obj.totalSize} records)`);
          Logger.info('Format: JSONL with metadata header for import compatibility');
        } catch (error) {
          Logger.error(`Error downloading ${obj.name} data: ${error.message}`);
        }
      } else if (obj.status === 'Failed') {
        // Check if this is a "no records" failure (which is not really a failure)
        const isNoRecordsFailure = obj.totalSize === 0 && 
          obj.errors && 
          obj.errors.some(error => error.includes('No ') && error.includes(' fetched'));
        
        if (isNoRecordsFailure) {
          Logger.warning(`  • ${obj.name}: No records available`);
        } else {
          Logger.error(`  • ${obj.name}: ${obj.errors?.join(', ') || 'Unknown error'}`);
        }
      } else if (obj.status === 'Completed') {
        Logger.info(`  • ${obj.name}: ${obj.totalSize} records (no file to download)`);
      } else {
        Logger.warning(`  • ${obj.name}: ${obj.status}`);
      }
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async downloadFileFromUrl(url) {
    const axios = require('axios');
    try {
      const response = await axios.get(url, {
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to download file from URL: ${error.message}`);
    }
  }

  displayResults(result, options) {
    if (options.verbose) {
      Logger.success('Metadata exported successfully!');
      Logger.debug('Response data', result, options);
    } else {
      Logger.success('Export job created successfully!');
    }

    // Always show job ID for consistency with import command
    if (result.jobId) {
      Logger.info(`✓ Export job created with ID: ${result.jobId}`);
    }

    // Show instructions for async jobs
    if (result.jobId && !options.wait) {
      Logger.warning('Job is running asynchronously.');
      Logger.info(`To wait for completion: nue platform export --object-type ${options.objectType} --sandbox --wait`);
      Logger.info(`To download results: nue platform export --download ${result.jobId} --sandbox`);
    }

    // Show file output if specified
    if (options.output) {
      Logger.info(`Results saved to: ${options.output}`);
    }
  }
}

module.exports = ExportMetadataCommand; 