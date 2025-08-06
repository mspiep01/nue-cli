const axios = require('axios');
const ErrorHandler = require('../utils/errorHandler');
const Logger = require('../utils/logger');

/**
 * Centralized API client for consistent API calls across commands
 */
class ApiClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.options = options;
    this.baseUrl = process.env.NUE_API_URL || 'https://api.nue.io';
  }

  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - Response data
   */
  async get(endpoint, params = {}) {
    try {
      Logger.verbose(`GET ${this.baseUrl}${endpoint}`, this.options);
      
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: {
          'nue-api-key': this.apiKey
        },
        params
      });

      Logger.debug('API Response', response.data, this.options);
      return response.data;
    } catch (error) {
      ErrorHandler.handleApiError(error, this.options, 'making GET request to', endpoint);
    }
  }

  /**
   * Make a POST request
   * @param {string} endpoint 
   * @param {Object} data
   * @param {Object} headers
   * @returns {Promise<Object>} - Response data
   */
  async post(endpoint, data = {}, headers = {}) {
    try {
      Logger.verbose(`POST ${this.baseUrl}${endpoint}`, this.options);
      Logger.debug('Request Data', data, this.options);
      
      const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
        headers: {
          'Content-Type': 'application/json',
          'nue-api-key': this.apiKey,
          ...headers
        }
      });

      Logger.debug('API Response', response.data, this.options);
      return response.data;
    } catch (error) {
      ErrorHandler.handleApiError(error, this.options, 'making POST request to', endpoint);
    }
  }

  /**
   * Make a PATCH request
   * @param {string} endpoint
   * @param {Object} data
   * @param {Object} headers 
   * @returns {Promise<Object>} - Response data
   */
  async patch(endpoint, data = {}, headers = {}) {
    try {
      Logger.verbose(`PATCH ${this.baseUrl}${endpoint}`, this.options);
      Logger.debug('Request Data', data, this.options);
      
      const response = await axios.patch(`${this.baseUrl}${endpoint}`, data, {
        headers: {
          'nue-api-key': this.apiKey,
          ...headers
        }
      });

      Logger.debug('API Response', response.data, this.options);
      return response.data;
    } catch (error) {
      ErrorHandler.handleApiError(error, this.options, 'making PATCH request to', endpoint);
    }
  }

  /**
   * Create an async export job
   * @param {Object} payload 
   * @returns {Promise<Object>} - Job response
   */
  async createExportJob(payload) {
    return this.post('/cpq/async/exports', payload);
  }

  /**
   * Create an async import job
   * @param {Object} payload 
   * @returns {Promise<Object>} - Job response
   */
  async createImportJob(payload) {
    return this.post('/cpq/async/imports', payload);
  }

  /**
   * Create a product catalog import job
   * @param {string} importOperation
   * @returns {Promise<Object>} - Job response
   */
  async createProductCatalogImportJob(importOperation = 'upsert') {
    return this.post(`/cpq/async/imports/revenue-builder-data?import-operation=${importOperation}`, {});
  }

  /**
   * Upload file content to import job
   * @param {string} jobId 
   * @param {Object} formData - Form data with file
   * @returns {Promise<Object>} - Upload response
   */
  async uploadImportFile(jobId, formData) {
    return this.patch(`/cpq/async/imports/${jobId}/content`, formData, formData.getHeaders());
  }

  /**
   * Get export job status
   * @param {string} jobId 
   * @returns {Promise<Object>} - Job status
   */
  async getExportJobStatus(jobId) {
    return this.get(`/cpq/async/exports/${jobId}`);
  }

  /**
   * Get import job status
   * @param {string} jobId 
   * @returns {Promise<Object>} - Job status
   */
  async getImportJobStatus(jobId) {
    try {
      // Try the revenue-builder-data specific endpoint first (this is the correct one for product catalog imports)
      Logger.debug(`Trying revenue-builder-data endpoint: /cpq/async/imports/revenue-builder-data/${jobId}`, this.options);
      return await this.get(`/cpq/async/imports/revenue-builder-data/${jobId}`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // Try the standard endpoint as fallback
        Logger.debug(`Revenue-builder-data endpoint failed, trying standard endpoint: /cpq/async/imports/${jobId}`, this.options);
        try {
          return await this.get(`/cpq/async/imports/${jobId}`);
        } catch (secondError) {
          if (secondError.response && secondError.response.status === 404) {
            // Try the exports endpoint as last resort
            Logger.debug(`Standard endpoint failed, trying exports endpoint: /cpq/async/exports/${jobId}`, this.options);
            return await this.get(`/cpq/async/exports/${jobId}`);
          }
          throw secondError;
        }
      }
      throw error;
    }
  }

  /**
   * Get transaction hub import job status
   * @param {string} jobId 
   * @returns {Promise<Object>} - Job status
   */
  async getTransactionHubImportJobStatus(jobId) {
    return this.get(`/revenue/transaction-hub/async-job/${jobId}`);
  }

  /**
   * Create transaction hub import job
   * @param {Object} data - Import data
   * @returns {Promise<Object>} - Job response
   */
  async createTransactionHubImportJob(data) {
    return this.post('/revenue/transaction-hub/upload', { data });
  }

  /**
   * Download file from URL
   * @param {string} url - File URL provided by Nue with built in credentials
   * @returns {Promise<Object>} - File content
   */
  async downloadFile(url) {
    try {
      Logger.verbose(`Downloading file from ${url}`, this.options);
      
      const response = await axios.get(url, {
        headers: {
          'nue-api-key': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      ErrorHandler.handleApiError(error, this.options, 'downloading file from', url);
    }
  }
}

module.exports = ApiClient; 