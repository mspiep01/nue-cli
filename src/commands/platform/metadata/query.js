const chalk = require('chalk');
const { PlatformCommandBuilder } = require('../../../services/platform-command');
const { PlatformManager } = require('../../../services/platform-manager');
const { ApiClientFactory } = require('../../../clients/api-client-factory');

class QueryMetadataCommand {
  constructor() {
    this.builder = new PlatformCommandBuilder('platform', 'metadata', 'query');
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
      console.log(chalk.blue('Querying metadata...'));

      // Validate input
      if (!options.query && !options.file) {
        throw new Error('Must specify --query or --file option');
      }

      // Parse query
      const query = await this.parseQuery(options);

      // Setup API client (GraphQL for queries)
      const apiClient = await this.setupApiClient(options);
      const platformManager = new PlatformManager(apiClient);

      // Prepare query options
      const queryOptions = {
        variables: options.variables ? JSON.parse(options.variables) : {},
        operationName: options.operationName,
        includeSchema: options.schema || false
      };

      if (options.verbose) {
        console.log(chalk.gray('Query:'));
        console.log(chalk.gray(query));
        if (queryOptions.variables && Object.keys(queryOptions.variables).length > 0) {
          console.log(chalk.gray('Variables:'));
          console.log(chalk.gray(JSON.stringify(queryOptions.variables, null, 2)));
        }
      }

      // Execute query
      const result = await platformManager.queryMetadata(query, queryOptions);

      // Display results
      this.displayResults(result, options);

    } catch (error) {
      console.error(chalk.red('Query failed:'), error.message);
      if (options.verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  }

  async parseQuery(options) {
    if (options.query) {
      return options.query;
    } else if (options.file) {
      const fs = require('fs');
      return fs.readFileSync(options.file, 'utf8');
    }
    throw new Error('Invalid query source');
  }

  async setupApiClient(options) {
    const { apiKey } = await this.builder.setupApi(options);
    return ApiClientFactory.createClient('platform', 'graphql', { apiKey });
  }

  displayResults(result, options) {
    if (options.verbose) {
      console.log(chalk.green('Query executed successfully!'));
      console.log(chalk.green('Response data:'));
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green('Query executed successfully!'));
      
      if (result.data) {
        // Display the actual data in a pretty format
        const { Formatter } = require('../../../utils/formatter');
        
        // Handle different data structures
        if (typeof result.data === 'object' && !Array.isArray(result.data)) {
          const keys = Object.keys(result.data);
          if (keys.length === 1) {
            // Single object type result (e.g., { Order: [...] })
            const objectType = keys[0];
            const data = result.data[objectType];
            if (Array.isArray(data)) {
              console.log(chalk.blue(`Found ${data.length} ${objectType}${data.length === 1 ? '' : 's'}:`));
              if (data.length > 0) {
                console.log(Formatter.formatPretty(data, objectType));
              }
            } else {
              console.log(chalk.blue(`Query returned: ${objectType}`));
              console.log(JSON.stringify(data, null, 2));
            }
          } else {
            // Multiple object types
            console.log(chalk.blue(`Query returned: ${keys.join(', ')}`));
            console.log(JSON.stringify(result.data, null, 2));
          }
        } else if (Array.isArray(result.data)) {
          console.log(chalk.blue(`Found ${result.data.length} results`));
          if (result.data.length > 0) {
            console.log(Formatter.formatPretty(result.data, 'result'));
          }
        } else {
          console.log(JSON.stringify(result.data, null, 2));
        }
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log(chalk.yellow(`GraphQL warnings: ${result.errors.length} issues found`));
      }
    }

    // Show file output if specified
    if (options.output) {
      console.log(chalk.blue(`Results saved to: ${options.output}`));
    }
  }
}

module.exports = QueryMetadataCommand; 