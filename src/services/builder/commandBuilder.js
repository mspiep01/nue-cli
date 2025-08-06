const { checkAndPromptForApiKey, ApiClient } = require('../../utils');
const Validator = require('../validator');
const { Logger, ErrorHandler } = require('../../utils');

/**
 * Base command class that provides consistent structure and common functionality
 */
class BaseCommand {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.options = new Map();
    this.arguments = [];
  }

  /**
   * Add a command argument
   * @param {string} name - Argument name
   * @param {string} description - Argument description
   * @param {boolean} required - Whether the argument is required
   * @returns {BaseCommand} - For method chaining
   */
  argument(name, description, required = true) {
    this.arguments.push({ name, description, required });
    return this;
  }

  /**
   * Add a command option
   * @param {string} flag - Option flag (e.g., '--verbose')
   * @param {string} description - Option description
   * @param {any} defaultValue - Default value
   * @param {Function} parser - Value parser function
   * @returns {BaseCommand} - For method chaining
   */
  option(flag, description, defaultValue = undefined, parser = undefined) {
    this.options.set(flag, { description, defaultValue, parser });
    return this;
  }

  /**
   * Add common options that most commands use
   * @returns {BaseCommand} - For method chaining
   */
  addCommonOptions() {
    return this
      .option('--sandbox', 'Use sandbox environment', false)
      .option('--verbose', 'Show detailed output information', false)
      .option('--timeout <seconds>', 'Timeout for async operations in seconds', 300, parseInt);
  }

  /**
   * Add file-related options
   * @returns {BaseCommand} - For method chaining
   */
  addFileOptions() {
    return this
      .option('--output <file>', 'Output file path (default: stdout)')
      .option('--format <format>', 'Input/output file format (json, jsonl, csv)', 'json');
  }

  /**
   * Add job-related options
   * @returns {BaseCommand} - For method chaining
   */
  addJobOptions() {
    return this
      .option('--wait', 'Wait for async job completion', false)
      .option('--download', 'Automatically download results when job completes', false);
  }

  /**
   * Add filter options
   * @returns {BaseCommand} - For method chaining
   */
  addFilterOptions() {
    return this
      .option('--id <id>', 'Filter by ID')
      .option('--name <name>', 'Filter by name')
      .option('--status <status>', 'Filter by status')
      .option('--created-after <date>', 'Filter by creation date (ISO format or relative like "1 day ago")')
      .option('--created-before <date>', 'Filter by creation date (ISO format or relative like "1 day ago")')
      .option('--limit <number>', 'Limit number of results', 1000, parseInt);
  }

  /**
   * Add object-specific filter options
   * @returns {BaseCommand} - For method chaining
   */
  addObjectFilterOptions() {
    return this
      .option('--customer-id <customerId>', 'Filter by customer ID')
      .option('--subscription-id <subscriptionId>', 'Filter by subscription ID')
      .option('--product-id <productId>', 'Filter by product ID')
      .option('--sku <sku>', 'Filter by SKU')
      .option('--active', 'Filter for active records only', false)
      .option('--inactive', 'Filter for inactive records only', false);
  }

  /**
   * Add GraphQL query options
   * @returns {BaseCommand} - For method chaining
   */
  addQueryOptions() {
    return this
      .option('--query-file <file>', 'Path to GraphQL query file')
      .option('--query <query>', 'GraphQL query string')
      .option('--variables <json>', 'GraphQL variables as JSON string')
      .option('--variables-file <file>', 'Path to GraphQL variables JSON file')
      .option('--format <format>', 'Output format (json, jsonl, csv, pretty)', 'pretty');
  }

  /**
   * Add import-specific options
   * @returns {BaseCommand} - For method chaining
   */
  addImportOptions() {
    return this
      .option('--dry-run', 'Validate import without actually importing', false)
      .option('--validate-only', 'Only validate the import file', false)
      .option('--skip-errors', 'Continue import even if some records fail', false)
      .option('--batch-size <number>', 'Number of records to process in each batch', 1000, parseInt)
      .option('--external-system <system>', 'External system for transaction hub imports')
      .option('--direction <direction>', 'Direction for transaction hub imports (inbound/outbound)', 'outbound')
      .option('--description <description>', 'Description for transaction hub imports')
      .option('--export-job-id <jobId>', 'Import from export job ID (automatically finds downloaded files)')
      .option('--import-operation <operation>', 'Import operation (upsert, insert, update)', 'upsert')
      .option('--all-objects', 'Import all available objects from export job', false);
  }

  /**
   * Build the command for Commander.js
   * @param {Object} program - Commander program instance
   * @param {Function} action - Command action function
   * @returns {Object} - Commander command instance
   */
  build(program, action) {
    let command = program.command(this.name).description(this.description);

    // Add arguments
    this.arguments.forEach(arg => {
      if (arg.required) {
        command = command.argument(`<${arg.name}>`, arg.description);
      } else {
        command = command.argument(`[${arg.name}]`, arg.description);
      }
    });

    // Add options
    this.options.forEach((option, flag) => {
      if (option.parser) {
        command = command.option(flag, option.description, option.defaultValue, option.parser);
      } else {
        command = command.option(flag, option.description, option.defaultValue);
      }
    });

    // Add action
    command.action(action);

    return command;
  }

  /**
   * Common setup for commands that need API access
   * @param {Object} options - Command options
   * @returns {Object} - Object containing apiKey and apiClient
   */
  async setupApi(options) {
    // Get API key
    const apiKey = await checkAndPromptForApiKey(options.sandbox);
    Validator.validateApiKey(apiKey, options);

    // Create API client
    const apiClient = new ApiClient(apiKey, options);

    return { apiKey, apiClient };
  }

  /**
   * Common error handling wrapper
   * @param {Function} fn - Function to execute
   * @param {Object} options - Command options
   * @param {string} context - Error context
   * @param {string} objectType - Object type for error messages
   */
  async executeWithErrorHandling(fn, options, context, objectType) {
    try {
      return await fn();
    } catch (error) {
      ErrorHandler.handleApiError(error, options, context, objectType);
    }
  }
}

/**
 * Import command builder with predefined options
 */
class ImportCommand extends BaseCommand {
  constructor() {
    super('import <objectType> [file]', 'Import data into Nue platform');
    
    this
      .addCommonOptions()
      .addFileOptions()
      .addJobOptions()
      .addImportOptions();
  }
}

/**
 * Export command builder with predefined options
 */
class ExportCommand extends BaseCommand {
  constructor() {
    super('export <objectType>', 'Export data from Nue platform using GraphQL queries');
    
    this
      .addCommonOptions()
      .addFileOptions()
      .addJobOptions()
      .addFilterOptions()
      .addObjectFilterOptions()
      .addQueryOptions();
  }
}

/**
 * Download command builder with predefined options
 */
class DownloadCommand extends BaseCommand {
  constructor() {
    super('download <jobId>', 'Download results from a completed export job');
    
    this
      .addCommonOptions()
      .addFileOptions()
      .option('--object-type <type>', 'Specific object type to download (default: all completed objects)');
  }
}

/**
 * Query command builder with predefined options
 */
class QueryCommand extends BaseCommand {
  constructor() {
    super('query <objectType>', 'Query objects using GraphQL for immediate data retrieval');
    
    this
      .addCommonOptions()
      .addFileOptions()
      .addFilterOptions()
      .addObjectFilterOptions()
      .addQueryOptions()
      .addUsageSpecificOptions();
  }

  /**
   * Add usage-specific filter options
   * @returns {QueryCommand} - For method chaining
   */
  addUsageSpecificOptions() {
    return this
      .option('--usage-id <usageId>', 'Filter by usage ID (UUID format)')
      .option('--account <accountName>', 'Filter by sales account name')
      .option('--timestamp <timestampFilter>', 'Filter by timestamp (e.g., "1 day ago", "2 months from now")');
  }
}

/**
 * Order command builder with predefined options
 */
class OrderCommand extends BaseCommand {
  constructor() {
    super('create-order', 'Create a new order in the Nue platform');
    
    this
      .addCommonOptions()
      .option('--json <json>', 'Order data as JSON string')
      .option('--file <file>', 'Path to JSON file containing order data');
  }
}

/**
 * Subscription command builder with predefined options
 */
class SubscriptionCommand extends BaseCommand {
  constructor() {
    super('get-subscriptions', 'Query subscriptions via the REST API');
    
    this
      .addCommonOptions()
      .addFileOptions()
      .addFilterOptions()
      .option('--customer-id <customerId>', 'Filter by customer ID')
      .option('--status <status>', 'Filter by subscription status');
  }
}

/**
 * Usage command builder with predefined options
 */
class UsageCommand extends BaseCommand {
  constructor() {
    super('upload-usage', 'Upload usage data to the Nue platform');
    
    this
      .addCommonOptions()
      .addFileOptions()
      .option('--customer-id <customerId>', 'Customer ID for usage data')
      .option('--subscription-id <subscriptionId>', 'Subscription ID for usage data');
  }
}

/**
 * Activate Order command builder with predefined options
 */
class ActivateOrderCommand extends BaseCommand {
  constructor() {
    super('activate-order <orderId>', 'Activate an existing order in the Nue platform');
    
    this
      .addCommonOptions()
      .option('--generate-invoice', 'Generate invoice during activation', false)
      .option('--activate-invoice', 'Activate invoice during activation', false);
  }
}

/**
 * Activate Change Order command builder with predefined options
 */
class ActivateChangeOrderCommand extends BaseCommand {
  constructor() {
    super('activate-change-order <changeOrderId>', 'Activate an existing change order in the Nue platform');
    
    this
      .addCommonOptions()
      .option('--generate-invoice', 'Generate invoice during activation', false)
      .option('--activate-invoice', 'Activate invoice during activation', false);
  }
}

/**
 * Create Change Order command builder with predefined options
 */
class CreateChangeOrderCommand extends BaseCommand {
  constructor() {
    super('create-change-order', 'Create a new change order in the Nue platform');
    
    this
      .addCommonOptions()
      .option('--json <json>', 'JSON payload for the change order')
      .option('--file <path>', 'Path to JSON file containing the change order payload')
      .option('--auto-activate', 'Automatically activate the change order after creation', false)
      .option('--generate-invoice', 'Generate invoice during activation (requires --auto-activate)', false)
      .option('--activate-invoice', 'Activate invoice during activation (requires --auto-activate)', false);
  }
}

/**
 * Get Subscriptions command builder with predefined options
 */
class GetSubscriptionsCommand extends BaseCommand {
  constructor() {
    super('get-subscriptions', 'Query subscriptions via the REST API');
    
    this
      .addCommonOptions()
      .addFileOptions()
      .option('--name <n>', 'Filter by subscription name')
      .option('--customer-ids <ids>', 'Filter by customer IDs (JSON array string)')
      .option('--status <status>', 'Filter by subscription status')
      .option('--include-product', 'Include product details', false)
      .option('--include-pricetags', 'Include price tags', false);
  }
}

module.exports = {
  BaseCommand,
  ImportCommand,
  ExportCommand,
  DownloadCommand,
  QueryCommand,
  OrderCommand,
  SubscriptionCommand,
  UsageCommand,
  ActivateOrderCommand,
  ActivateChangeOrderCommand,
  CreateChangeOrderCommand,
  GetSubscriptionsCommand
}; 