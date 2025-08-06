const ErrorHandler = require('../utils/errorHandler');
const Logger = require('../utils/logger');

/**
 * Centralized job management utilities for consistent job handling across commands
 */
class JobManager {
  /**
   * Wait for export job completion
   * @param {string} jobId 
   * @param {Object} apiClient 
   * @param {Object} options - Command options
   * @returns {Promise<Object>} - Final job status
   */
  static async waitForExportCompletion(jobId, apiClient, options) {
    const startTime = Date.now();
    const timeoutMs = options.timeout * 1000;

    Logger.progress('Waiting for export job completion...');

    while (true) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Export job timed out after ${options.timeout} seconds`);
      }

      try {
        const status = await apiClient.getExportJobStatus(jobId);
        Logger.debug('Status Response', status, options);

        // Check for terminal states (case-insensitive)
        const statusLower = status.status.toLowerCase();
        
        if (statusLower === 'completed' || statusLower === 'succeeded') {
          Logger.success('Export job completed successfully!');
          return status;
        } else if (statusLower === 'failed') {
          // Check if we have any completed objects - if so, show partial success
          const completedObjects = status.objects?.filter(obj => obj.status === 'Completed') || [];
          const noRecordsObjects = status.objects?.filter(obj => 
            obj.status === 'Failed' && 
            obj.totalSize === 0 && 
            obj.errors && 
            obj.errors.some(error => error.includes('No ') && error.includes(' fetched'))
          ) || [];
          const actualFailedObjects = status.objects?.filter(obj => 
            obj.status === 'Failed' && 
            !(obj.totalSize === 0 && 
              obj.errors && 
              obj.errors.some(error => error.includes('No ') && error.includes(' fetched')))
          ) || [];
          
          if (completedObjects.length > 0 || noRecordsObjects.length > 0) {
            Logger.success('Export job completed with partial success');
            return status;
          } else {
            ErrorHandler.handleJobFailure(status, options);
          }
        } else {
          Logger.jobStatus(status.status);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          Logger.warning('Export job not found yet, waiting...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Wait for import job completion
   * @param {string} jobId - Job ID
   * @param {Object} apiClient - API client instance
   * @param {Object} options - Command options
   * @returns {Promise<Object>} - Final job status
   */
  static async waitForImportCompletion(jobId, apiClient, options) {
    const startTime = Date.now();
    const timeoutMs = options.timeout * 1000;

    Logger.progress('Waiting for import job completion...');

    while (true) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Import job timed out after ${options.timeout} seconds`);
      }

      try {
        const status = await apiClient.getImportJobStatus(jobId);
        Logger.debug('Status Response', status, options);

        // Handle different status formats
        const statusLower = status.status.toLowerCase();
        
        if (statusLower === 'completed' || statusLower === 'succeeded') {
          Logger.success('Import job completed successfully!');
          return status;
        } else if (statusLower === 'failed') {
          // Check if we have any completed or partial completed import jobs
          const importJobs = status.importJobs || [];
          const hasPartialSuccess = importJobs.some(job => 
            job.status === 'PartialCompleted' || job.status === 'Completed'
          );
          
          if (hasPartialSuccess) {
            Logger.warning('Import job completed with partial success');
            return status;
          } else {
            ErrorHandler.handleJobFailure(status, options);
          }
        } else if (statusLower === 'partialcompleted') {
          Logger.warning('Import job completed with partial success');
          return status;
        } else {
          Logger.jobStatus(status.status);
          if (options.verbose && status.result) {
            Logger.verbose(`Progress: ${JSON.stringify(status.result)}`);
          }
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          Logger.warning('Import job not found yet, waiting...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Wait for transaction hub import job completion
   * @param {string} jobId - Job ID
   * @param {Object} apiClient - API client instance
   * @param {Object} options - Command options
   * @returns {Promise<Object>} - Final job status
   */
  static async waitForTransactionHubImportCompletion(jobId, apiClient, options) {
    const startTime = Date.now();
    const timeoutMs = options.timeout * 1000;

    Logger.progress('Waiting for transaction hub import job completion...');

    while (true) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Import job timed out after ${options.timeout} seconds`);
      }

      try {
        const status = await apiClient.getTransactionHubImportJobStatus(jobId);

        if (status.status === 'completed') {
          Logger.success('Transaction hub import job completed successfully!');
          return status;
        } else if (status.status === 'failed') {
          ErrorHandler.handleJobFailure(status, options);
        } else {
          Logger.jobStatus(status.status);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          Logger.warning('Import job not found yet, waiting...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Display job summary with completed, no records, and failed objects
   * @param {Object} status - Job status
   * @param {Object} options - Command options
   */
  static displayJobSummary(status, options) {
    const completedObjects = status.objects?.filter(obj => obj.status === 'Completed') || [];
    const noRecordsObjects = status.objects?.filter(obj => 
      obj.status === 'Failed' && 
      obj.totalSize === 0 && 
      obj.errors && 
      obj.errors.some(error => error.includes('No ') && error.includes(' fetched'))
    ) || [];
    const actualFailedObjects = status.objects?.filter(obj => 
      obj.status === 'Failed' && 
      !(obj.totalSize === 0 && 
        obj.errors && 
        obj.errors.some(error => error.includes('No ') && error.includes(' fetched')))
    ) || [];
    
    if (completedObjects.length > 0) {
      Logger.info('Completed objects:');
      completedObjects.forEach(obj => {
        Logger.info(`  • ${obj.name}: ${obj.totalSize} records`);
      });
    }
    
    if (noRecordsObjects.length > 0) {
      Logger.warning('No records found:');
      noRecordsObjects.forEach(obj => {
        Logger.warning(`  • ${obj.name}: No records available`);
      });
    }
    
    if (actualFailedObjects.length > 0) {
      Logger.error('Failed objects:');
      actualFailedObjects.forEach(obj => {
        Logger.error(`  • ${obj.name}: ${obj.errors?.join(', ') || 'Unknown error'}`);
      });
    }
  }
}

module.exports = JobManager; 