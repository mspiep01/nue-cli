const RestClient = require('./rest-client');

class JobClient extends RestClient {
  constructor(platform, options = {}) {
    super(platform, options);
    this.pollingInterval = options.pollingInterval || 5000; // 5 seconds
    this.maxPollingTime = options.maxPollingTime || 3600000; // 1 hour
  }

  async createExportJob(objectType, filters = {}, options = {}) {
    const data = {
      objectType,
      filters,
      format: options.format || 'json',
      includeMetadata: options.includeMetadata || false,
      includeSchema: options.includeSchema || false,
      priority: options.priority || 'normal',
      timeout: options.timeout || 3600
    };
    
    return await this.post('/jobs/export', data);
  }

  async createImportJob(objectType, data, options = {}) {
    const jobData = {
      objectType,
      data,
      operation: options.operation || 'upsert',
      validateOnly: options.validateOnly || false,
      overwrite: options.overwrite || false,
      priority: options.priority || 'normal',
      timeout: options.timeout || 3600
    };
    
    return await this.post('/jobs/import', jobData);
  }

  async createSyncJob(provider, objects = [], options = {}) {
    const data = {
      provider,
      objects,
      syncMode: options.syncMode || 'batch',
      direction: options.direction || 'bidirectional',
      priority: options.priority || 'normal',
      timeout: options.timeout || 3600
    };
    
    return await this.post('/jobs/sync', data);
  }

  async getJobStatus(jobId) {
    return await this.get(`/jobs/${jobId}/status`);
  }

  async getJobProgress(jobId) {
    return await this.get(`/jobs/${jobId}/progress`);
  }

  async cancelJob(jobId) {
    return await this.post(`/jobs/${jobId}/cancel`);
  }

  async retryJob(jobId) {
    return await this.post(`/jobs/${jobId}/retry`);
  }

  async downloadJobResults(jobId, format = 'json') {
    return await this.get(`/jobs/${jobId}/download`, { format });
  }

  async listJobs(filters = {}) {
    return await this.get('/jobs', { params: filters });
  }

  async waitForJobCompletion(jobId, options = {}) {
    const startTime = Date.now();
    const pollingInterval = options.pollingInterval || this.pollingInterval;
    const maxPollingTime = options.maxPollingTime || this.maxPollingTime;

    while (true) {
      const status = await this.getJobStatus(jobId);
      
      if (status.state === 'completed') {
        return status;
      }
      
      if (status.state === 'failed') {
        throw new Error(`Job ${jobId} failed: ${status.error || 'Unknown error'}`);
      }
      
      if (status.state === 'cancelled') {
        throw new Error(`Job ${jobId} was cancelled`);
      }
      
      // Check if we've exceeded the maximum polling time
      if (Date.now() - startTime > maxPollingTime) {
        throw new Error(`Job ${jobId} timed out after ${maxPollingTime / 1000} seconds`);
      }
      
      // Wait before polling again
      await this.sleep(pollingInterval);
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper method to create and wait for export job
  async exportAndWait(objectType, filters = {}, options = {}) {
    const job = await this.createExportJob(objectType, filters, options);
    const jobId = job.id || job.jobId;
    
    console.log(`Export job created: ${jobId}`);
    console.log('Waiting for completion...');
    
    const result = await this.waitForJobCompletion(jobId, options);
    
    if (result.downloadUrl) {
      return await this.downloadJobResults(jobId, options.format);
    }
    
    return result;
  }

  // Helper method to create and wait for import job
  async importAndWait(objectType, data, options = {}) {
    const job = await this.createImportJob(objectType, data, options);
    const jobId = job.id || job.jobId;
    
    console.log(`Import job created: ${jobId}`);
    console.log('Waiting for completion...');
    
    return await this.waitForJobCompletion(jobId, options);
  }

  // Helper method to create and wait for sync job
  async syncAndWait(provider, objects = [], options = {}) {
    const job = await this.createSyncJob(provider, objects, options);
    const jobId = job.id || job.jobId;
    
    console.log(`Sync job created: ${jobId}`);
    console.log('Waiting for completion...');
    
    return await this.waitForJobCompletion(jobId, options);
  }
}

module.exports = JobClient; 