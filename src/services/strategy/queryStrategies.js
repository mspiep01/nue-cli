const Validator = require('../validator');
const { ObjectTypeRegistry } = require('../objectTypes');
const { Logger, Formatter, ApiClient, FileUtils } = require('../../utils');
const { QueryBuilder, CustomQueryBuilder } = require('../builder');

/**
 * Base strategy for query operations
 */
class QueryStrategy {
  constructor(apiClient, options) {
    this.apiClient = apiClient;
    this.options = options;
  }

  /**
   * Execute the query strategy
   * @param {string} objectType - The object type to query
   */
  async execute(objectType) {
    throw new Error('execute method must be implemented by subclass');
  }

  /**
   * Build GraphQL query
   * @param {string} objectType - Object type
   * @returns {Object} - Query and variables
   */
  async buildQuery(objectType) {
    // Load custom query if provided
    if (this.options.queryFile) {
      return CustomQueryBuilder.buildFromFile(this.options.queryFile, this.options.variablesFile);
    }

    if (this.options.query) {
      return CustomQueryBuilder.buildFromString(this.options.query, this.options.variables);
    }

    return this.buildDefaultQuery(objectType);
  }

  /**
   * Build default GraphQL query using the new QueryBuilder
   * @param {string} objectType - Object type
   * @returns {Object} - Query and variables
   */
  buildDefaultQuery(objectType) {
    const queryBuilder = new QueryBuilder();
    return queryBuilder.buildQuery(objectType, this.options);
  }

  /**
   * Execute GraphQL query
   * @param {string} objectType - Object type
   * @param {string} query - GraphQL query
   * @param {Object} variables - GraphQL variables
   */
  async executeQuery(objectType, query, variables) {
    // Determine the correct GraphQL endpoint based on object type
    let graphqlEndpoint = '/v1/async/graphql';
    if (objectType.toLowerCase() === 'usage') {
      graphqlEndpoint = '/usage/async/graphql';
    }
    
    const response = await this.apiClient.post(graphqlEndpoint, {
      query,
      variables
    });
    
    // Check for GraphQL errors first
    if (response.errors && response.errors.length > 0) {
      Logger.error(`GraphQL validation errors for ${objectType}:`);
      response.errors.forEach(error => {
        Logger.error(`  • ${error.message}`);
      });
      throw new Error(`GraphQL validation failed for ${objectType}`);
    }

    // Process and display results
    if (response.data) {
      const objectTypeRegistry = new ObjectTypeRegistry();
      const objectTypeDef = objectTypeRegistry.get(objectType);
      const normalizedType = objectTypeDef ? objectTypeDef.apiName : objectType;
      
      let results = response.data[normalizedType] || [];
      
      // Apply limit on client side if specified
      if (this.options.limit && this.options.limit > 0 && results.length > this.options.limit) {
        results = results.slice(0, this.options.limit);
      }
      
      if (this.options.output) {
        // Write to file
        let outputData;
        const format = this.options.format || 'json';
        
        if (format === 'json') {
          outputData = Formatter.formatJSON(results, true);
        } else if (format === 'jsonl') {
          outputData = Formatter.formatJSONL(results);
        } else if (format === 'csv') {
          outputData = Formatter.formatCSV(results);
        } else if (format === 'pretty') {
          outputData = Formatter.formatPretty(results, objectType);
        } else {
          outputData = Formatter.formatJSON(results, true);
        }
        
        FileUtils.writeOutput(this.options.output, outputData);
        Logger.success(`Data written to: ${this.options.output}`);
      } else {
        // Output to stdout
        const format = this.options.format || 'pretty';
        
        if (format === 'json') {
          console.log(Formatter.formatJSON(results, true));
        } else if (format === 'jsonl') {
          console.log(Formatter.formatJSONL(results));
        } else if (format === 'csv') {
          console.log(Formatter.formatCSV(results));
        } else if (format === 'pretty') {
          console.log(Formatter.formatPretty(results, objectType));
        } else {
          console.log(Formatter.formatPretty(results, objectType));
        }
      }
      
      if (results.length > 0) {
        Logger.success(`Successfully queried ${results.length} ${objectType} records`);
      } else {
        Logger.warning(`No ${objectType} data found`);
      }
    } else {
      Logger.warning(`No ${objectType} data found`);
    }
  }

  /**
   * Convert data to CSV format
   * @param {Array} data - Data array
   * @returns {string} - CSV string
   */
  convertToCSV(data) {
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
        return value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}

/**
 * Strategy for standard GraphQL queries
 */
class StandardQueryStrategy extends QueryStrategy {
  /**
   * Execute the query strategy
   * @param {string} objectType - The object type to query
   */
  async execute(objectType) {
    // Validate object type
    Validator.validateObjectType(objectType, this.options);

    Logger.info(`Querying ${objectType} data...`, this.options);

    // Build query
    const { query, variables } = await this.buildQuery(objectType);

    if (this.options.verbose) {
      Logger.debug('GraphQL Query:', this.options);
      Logger.debug(query, this.options);
      if (Object.keys(variables).length > 0) {
        Logger.debug('Variables:', this.options);
        Logger.debug(JSON.stringify(variables, null, 2), this.options);
      }
    }

    // Execute query
    await this.executeQuery(objectType, query, variables);
  }
}

/**
 * Factory for creating query strategies
 */
class QueryStrategyFactory {
  /**
   * Create the appropriate query strategy
   * @param {Object} options - Command options
   * @param {Object} apiClient - API client instance
   * @returns {QueryStrategy} - The appropriate strategy
   */
  static createStrategy(options, apiClient) {
    return new StandardQueryStrategy(apiClient, options);
  }
}

module.exports = {
  QueryStrategy,
  StandardQueryStrategy,
  QueryStrategyFactory
}; 