const { normalizeObjectType, getObjectFields } = require('../objectTypes');
const { Logger, FileUtils, JobManager } = require('../../utils');
const { QueryBuilder, CustomQueryBuilder } = require('../builder');

/**
 * Base strategy class for export operations
 */
class ExportStrategy {
  constructor(apiClient, options) {
    this.apiClient = apiClient;
    this.options = options;
  }

  async execute(objectType) {
    throw new Error('execute method must be implemented by subclass');
  }

  async waitForCompletion(jobId) {
    if (this.options.wait) {
      Logger.progress('Waiting for job completion...');
      const status = await JobManager.waitForExportCompletion(jobId, this.apiClient, this.options);
      
      if (this.options.download) {
        await this.downloadResults(status);
      }
    } else {
      Logger.warning('Job is running asynchronously.');
      Logger.info(`To wait for completion: nue export ${this.options.objectType} --sandbox --wait`);
      Logger.info(`To download results: nue download ${jobId} --sandbox`);
    }
  }

  async downloadResults(status) {
    if (!status.objects || status.objects.length === 0) {
      Logger.warning('No export results available');
      return;
    }

    const requestedObjectType = this.options.objectType?.toLowerCase();
    
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
          const data = await this.apiClient.downloadFile(obj.fileUrls[0]);
          
          let outputPath = this.options.output;
          
          // If we have multiple objects, create individual files with proper naming
          if (needsIndividualFiles) {
            const jobId = this.options.jobId || 'unknown';
            const extension = this.options.output ? require('path').extname(this.options.output) : '.jsonl';
            const baseExtension = extension || '.jsonl';
            
            if (this.options.output) {
              // If output path is specified, create files in the same directory
              const dir = require('path').dirname(this.options.output);
              const baseName = require('path').basename(this.options.output, baseExtension);
              outputPath = require('path').join(dir, `${obj.name.toLowerCase()}-${jobId}${baseExtension}`);
            } else {
              // If no output path, create files in current directory
              outputPath = `${obj.name.toLowerCase()}-${jobId}${baseExtension}`;
            }
          }
          
          FileUtils.writeOutput(data, outputPath, this.options);
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
}

/**
 * Strategy for GraphQL-based exports
 */
class GraphQLExportStrategy extends ExportStrategy {
  async execute(objectType) {
    // Create async export job using GraphQL query
    const { query, variables } = await this.buildQuery(objectType);

    Logger.verbose('GraphQL query:', this.options);
    Logger.verbose(query, this.options);
    if (Object.keys(variables).length > 0) {
      Logger.verbose('Variables:', this.options);
      Logger.verbose(JSON.stringify(variables, null, 2), this.options);
    }

    await this.createExportJob(objectType, query, variables);
  }

  async buildQuery(objectType) {
    // If query file is provided, load from file
    if (this.options.queryFile) {
      return await this.loadQueryFromFile(this.options.queryFile, this.options.variablesFile);
    }

    // If query string is provided, use it
    if (this.options.query) {
      const variables = this.options.variables ? JSON.parse(this.options.variables) : {};
      return { query: this.options.query, variables };
    }

    // Build query based on object type and options
    return this.buildDefaultQuery(objectType);
  }

  async loadQueryFromFile(queryFilePath, variablesFilePath) {
    try {
      return CustomQueryBuilder.buildFromFile(queryFilePath, variablesFilePath);
    } catch (error) {
      throw new Error(`Error loading query file: ${error.message}`);
    }
  }

  buildDefaultQuery(objectType) {
    const queryBuilder = new QueryBuilder();
    return queryBuilder.buildQuery(objectType, this.options);
  }

  async createExportJob(objectType, query, variables) {
    // Create export job using the async export endpoint
    const exportJobResponse = await this.apiClient.createExportJob({
      query: query,
      variables: variables
    });

    Logger.debug('API Response', exportJobResponse, this.options);

    const jobId = exportJobResponse.jobid || exportJobResponse.jobId;
    Logger.success('Export job created successfully!');
    Logger.info(`Job ID: ${jobId}`);

    await this.waitForCompletion(jobId);
  }
}

/**
 * Strategy for download operations
 */
class DownloadStrategy extends ExportStrategy {
  async execute(jobId) {
    Logger.info(`Checking status of export job ${jobId}...`);
    
    // Check job status
    const status = await this.apiClient.getExportJobStatus(jobId);
    
    if (status.status === 'Processing') {
      Logger.warning('Job is still processing. Please wait and try again.');
      process.exit(1);
    }
    
    if (status.status === 'Failed' && (!status.objects || status.objects.filter(obj => obj.status === 'Completed').length === 0)) {
      Logger.error('Job failed completely. No results available.');
      process.exit(1);
    }
    
    // Add objectType to options for filtering
    if (this.options.objectType) {
      this.options.objectType = this.options.objectType.toLowerCase();
    }
    
    // Download results with jobId included
    await this.downloadResults(status);
  }
}

/**
 * Export strategy factory
 */
class ExportStrategyFactory {
  static createStrategy(options, apiClient) {
    // For download operations
    if (options.jobId) {
      return new DownloadStrategy(apiClient, options);
    }
    
    // For export operations
    return new GraphQLExportStrategy(apiClient, options);
  }
}

module.exports = {
  ExportStrategy,
  GraphQLExportStrategy,
  DownloadStrategy,
  ExportStrategyFactory
}; 