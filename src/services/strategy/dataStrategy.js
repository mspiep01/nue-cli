const { ApiClient } = require('../../utils');

/**
 * Data Strategy for handling data import/export operations
 */
class DataStrategy {
  constructor(options = {}, apiClient = null) {
    this.options = options;
    this.apiClient = apiClient || new ApiClient();
    this.metadata = {
      type: 'data',
      description: 'Strategy for data import/export operations',
      supportedOperations: ['import', 'export', 'query'],
      requiredOptions: ['apiKey', 'objectType'],
      optionalOptions: ['sandbox', 'verbose', 'format', 'file'],
      examples: [
        'nue export-data customers --format csv',
        'nue import-data customers customers.json --dry-run'
      ]
    };
  }

  /**
   * Execute the data strategy
   * @param {Object} options - Command options
   */
  async execute(options) {
    const operation = this.determineOperation(options);
    
    switch (operation) {
      case 'import':
        return await this.importData(options);
      case 'export':
        return await this.exportData(options);
      case 'query':
        return await this.queryData(options);
      default:
        throw new Error(`Unknown data operation: ${operation}`);
    }
  }

  /**
   * Determine the operation based on options
   * @param {Object} options - Command options
   * @returns {string} Operation type
   */
  determineOperation(options) {
    if (options.import) {
      return 'import';
    }
    
    if (options.export) {
      return 'export';
    }
    
    return 'query';
  }

  /**
   * Import data
   * @param {Object} options - Command options
   */
  async importData(options) {
    console.log(`Importing ${options.objectType} data...`);
    
    const importData = await this.getImportData(options);
    const importOptions = {
      dryRun: options.dryRun || false,
      validateOnly: options.validateOnly || false,
      skipErrors: options.skipErrors || false,
      batchSize: options.batchSize || 1000,
      importOperation: options.importOperation || 'upsert'
    };
    
    const response = await this.apiClient.post('/v1/import', {
      objectType: options.objectType,
      data: importData,
      options: importOptions
    });
    
    console.log(`Import job created: ${response.data.jobId}`);
    
    if (options.wait) {
      return await this.waitForJob(response.data.jobId);
    }
    
    return response.data;
  }

  /**
   * Export data
   * @param {Object} options - Command options
   */
  async exportData(options) {
    console.log(`Exporting ${options.objectType} data...`);
    
    const exportOptions = {
      format: options.format || 'json',
      filters: this.buildFilters(options),
      query: options.query || null,
      queryFile: options.queryFile || null
    };
    
    const response = await this.apiClient.post('/v1/export', {
      objectType: options.objectType,
      options: exportOptions
    });
    
    console.log(`Export job created: ${response.data.jobId}`);
    
    if (options.wait) {
      return await this.waitForJob(response.data.jobId);
    }
    
    return response.data;
  }

  /**
   * Query data
   * @param {Object} options - Command options
   */
  async queryData(options) {
    console.log(`Querying ${options.objectType} data...`);
    
    const query = await this.getQuery(options);
    const variables = await this.getVariables(options);
    
    const response = await this.apiClient.post('/v1/graphql', {
      query,
      variables
    });
    
    console.log(`Query executed successfully`);
    
    if (options.output) {
      await this.saveOutput(response.data, options.output, options.format);
    } else {
      console.log(JSON.stringify(response.data, null, 2));
    }
    
    return response.data;
  }

  /**
   * Wait for job completion
   * @param {string} jobId - Job ID
   * @returns {Object} Job result
   */
  async waitForJob(jobId) {
    console.log(`Waiting for job ${jobId} to complete...`);
    
    let status = 'pending';
    while (status === 'pending' || status === 'running') {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const response = await this.apiClient.get(`/v1/jobs/${jobId}/status`);
      status = response.data.status;
      
      console.log(`Job status: ${status}`);
    }
    
    if (status === 'completed') {
      console.log(`Job completed successfully`);
      return await this.apiClient.get(`/v1/jobs/${jobId}/result`);
    } else {
      throw new Error(`Job failed with status: ${status}`);
    }
  }

  /**
   * Get import data from options
   * @param {Object} options - Command options
   * @returns {Array} Import data
   */
  async getImportData(options) {
    if (options.file) {
      const fs = require('fs');
      const fileContent = fs.readFileSync(options.file, 'utf8');
      
      if (options.format === 'csv') {
        return this.parseCSV(fileContent);
      }
      
      return JSON.parse(fileContent);
    }
    
    throw new Error('Must provide --file option for import');
  }

  /**
   * Get query from options
   * @param {Object} options - Command options
   * @returns {string} GraphQL query
   */
  async getQuery(options) {
    if (options.query) {
      return options.query;
    }
    
    if (options.queryFile) {
      const fs = require('fs');
      return fs.readFileSync(options.queryFile, 'utf8');
    }
    
    // Default query based on object type
    return this.getDefaultQuery(options.objectType);
  }

  /**
   * Get variables from options
   * @param {Object} options - Command options
   * @returns {Object} GraphQL variables
   */
  async getVariables(options) {
    if (options.variables) {
      return JSON.parse(options.variables);
    }
    
    if (options.variablesFile) {
      const fs = require('fs');
      const fileContent = fs.readFileSync(options.variablesFile, 'utf8');
      return JSON.parse(fileContent);
    }
    
    return {};
  }

  /**
   * Build filters from options
   * @param {Object} options - Command options
   * @returns {Object} Filter object
   */
  buildFilters(options) {
    const filters = {};
    
    if (options.id) filters.id = options.id;
    if (options.name) filters.name = options.name;
    if (options.status) filters.status = options.status;
    if (options.customerId) filters.customerId = options.customerId;
    if (options.subscriptionId) filters.subscriptionId = options.subscriptionId;
    if (options.createdAfter) filters.createdAfter = options.createdAfter;
    if (options.createdBefore) filters.createdBefore = options.createdBefore;
    if (options.limit) filters.limit = options.limit;
    
    return filters;
  }

  /**
   * Get default query for object type
   * @param {string} objectType - Object type
   * @returns {string} Default GraphQL query
   */
  getDefaultQuery(objectType) {
    const queries = {
      customers: `
        query GetCustomers($limit: Int) {
          customers(limit: $limit) {
            id
            name
            email
            status
            createdAt
          }
        }
      `,
      subscriptions: `
        query GetSubscriptions($limit: Int) {
          subscriptions(limit: $limit) {
            id
            name
            status
            customerId
            createdAt
          }
        }
      `,
      orders: `
        query GetOrders($limit: Int) {
          orders(limit: $limit) {
            id
            orderNumber
            status
            customerId
            totalAmount
            createdAt
          }
        }
      `
    };
    
    return queries[objectType] || `
      query GetObjects($limit: Int) {
        ${objectType}(limit: $limit) {
          id
          createdAt
        }
      }
    `;
  }

  /**
   * Parse CSV content
   * @param {string} content - CSV content
   * @returns {Array} Parsed data
   */
  parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        data.push(row);
      }
    }
    
    return data;
  }

  /**
   * Save output to file
   * @param {Object} data - Data to save
   * @param {string} outputPath - Output file path
   * @param {string} format - Output format
   */
  async saveOutput(data, outputPath, format = 'json') {
    const fs = require('fs');
    
    let content;
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      content = this.convertToCSV(data);
    } else {
      content = JSON.stringify(data);
    }
    
    fs.writeFileSync(outputPath, content);
    console.log(`Output saved to: ${outputPath}`);
  }

  /**
   * Convert data to CSV
   * @param {Object} data - Data to convert
   * @returns {string} CSV content
   */
  convertToCSV(data) {
    if (!data || !Array.isArray(data)) {
      return '';
    }
    
    if (data.length === 0) {
      return '';
    }
    
    const headers = Object.keys(data[0]);
    const csvLines = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header] || '';
        return `"${value}"`;
      });
      csvLines.push(values.join(','));
    }
    
    return csvLines.join('\n');
  }
}

/**
 * Data Strategy Factory
 * @param {Object} options - Strategy options
 * @param {Object} apiClient - API client instance
 * @returns {DataStrategy} Data strategy instance
 */
function DataStrategyFactory(options, apiClient) {
  return new DataStrategy(options, apiClient);
}

// Export with metadata for auto-registration
DataStrategyFactory.metadata = {
  type: 'data',
  description: 'Strategy for data import/export operations',
  supportedOperations: ['import', 'export', 'query'],
  requiredOptions: ['apiKey', 'objectType'],
  optionalOptions: ['sandbox', 'verbose', 'format', 'file'],
  command: {
    name: 'data',
    description: 'Data management operations',
    options: {
      objectType: {
        flag: '--object-type <type>',
        description: 'Object type to operate on'
      },
      file: {
        flag: '--file <file>',
        description: 'Input/output file path'
      },
      format: {
        flag: '--format <format>',
        description: 'File format (json, csv)',
        defaultValue: 'json'
      }
    }
  }
};

module.exports = {
  DataStrategy,
  DataStrategyFactory
}; 