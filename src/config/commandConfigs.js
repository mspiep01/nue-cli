/**
 * Configuration-driven command definitions
 * This allows for automatic command generation based on configuration
 */
const commandConfigs = {
  // Order management commands
  'create-order': {
    description: 'Create a new order in the Nue platform',
    category: 'orders',
    arguments: [],
    options: {
      common: true,
      file: true,
      activation: true
    },
    examples: [
      'nue create-order --file order.json',
      'nue create-order --json \'{"customer": {...}}\' --auto-activate'
    ]
  },
  'activate-order': {
    description: 'Activate an existing order',
    category: 'orders',
    arguments: ['orderId'],
    options: {
      common: true,
      activation: true
    },
    examples: [
      'nue activate-order order-123',
      'nue activate-order order-123 --generate-invoice --activate-invoice'
    ]
  },
  'create-change-order': {
    description: 'Create a new change order',
    category: 'orders',
    arguments: [],
    options: {
      common: true,
      file: true,
      activation: true
    },
    examples: [
      'nue create-change-order --file change-order.json',
      'nue create-change-order --json \'{"subscription": {...}}\' --auto-activate'
    ]
  },
  'activate-change-order': {
    description: 'Activate an existing change order',
    category: 'orders',
    arguments: ['changeOrderId'],
    options: {
      common: true,
      activation: true
    },
    examples: [
      'nue activate-change-order change-order-123',
      'nue activate-change-order change-order-123 --generate-invoice'
    ]
  },

  // Data management commands
  'export-data': {
    description: 'Export data from Nue platform using GraphQL queries',
    category: 'data',
    arguments: ['objectType'],
    options: {
      common: true,
      file: true,
      job: true,
      filter: true,
      query: true
    },
    examples: [
      'nue export-data customers',
      'nue export-data subscriptions --customer-id cust-123 --format csv'
    ]
  },
  'import-data': {
    description: 'Import data into Nue platform',
    category: 'data',
    arguments: ['objectType', 'file'],
    options: {
      common: true,
      file: true,
      job: true,
      import: true
    },
    examples: [
      'nue import-data customers customers.json',
      'nue import-data subscriptions subs.csv --dry-run --batch-size 500'
    ]
  },
  'query-objects': {
    description: 'Query objects using GraphQL for immediate data retrieval',
    category: 'data',
    arguments: ['objectType'],
    options: {
      common: true,
      file: true,
      filter: true,
      query: true
    },
    examples: [
      'nue query-objects customers',
      'nue query-objects subscriptions --query-file query.graphql'
    ]
  },

  // Subscription management commands
  'get-subscriptions': {
    description: 'Query subscriptions via the REST API',
    category: 'subscriptions',
    arguments: [],
    options: {
      common: true,
      file: true,
      filter: true
    },
    examples: [
      'nue get-subscriptions',
      'nue get-subscriptions --customer-id cust-123 --status active'
    ]
  },

  // Usage management commands
  'upload-usage': {
    description: 'Upload usage data to the Nue platform',
    category: 'usage',
    arguments: [],
    options: {
      common: true,
      file: true
    },
    examples: [
      'nue upload-usage --file usage.json',
      'nue upload-usage --file usage.csv --customer-id cust-123'
    ]
  },

  // Configuration commands
  'set-api-key': {
    description: 'Set API key for authentication',
    category: 'config',
    arguments: [],
    options: {
      common: false
    },
    examples: [
      'nue set-api-key',
      'nue set-api-key --sandbox'
    ]
  }
};

/**
 * Option configurations for different command types
 */
const optionConfigs = {
  common: {
    sandbox: {
      flag: '--sandbox',
      description: 'Use sandbox environment',
      defaultValue: false
    },
    verbose: {
      flag: '--verbose',
      description: 'Show detailed output information',
      defaultValue: false
    },
    timeout: {
      flag: '--timeout <seconds>',
      description: 'Timeout for async operations in seconds',
      defaultValue: 300,
      parser: parseInt
    }
  },
  file: {
    output: {
      flag: '--output <file>',
      description: 'Output file path (default: stdout)'
    },
    format: {
      flag: '--format <format>',
      description: 'Input/output file format (json, jsonl, csv)',
      defaultValue: 'json'
    }
  },
  activation: {
    autoActivate: {
      flag: '--auto-activate',
      description: 'Automatically activate after creation',
      defaultValue: false
    },
    generateInvoice: {
      flag: '--generate-invoice',
      description: 'Generate invoice during activation',
      defaultValue: false
    },
    activateInvoice: {
      flag: '--activate-invoice',
      description: 'Activate invoice during activation',
      defaultValue: false
    }
  },
  job: {
    wait: {
      flag: '--wait',
      description: 'Wait for async job completion',
      defaultValue: false
    },
    download: {
      flag: '--download',
      description: 'Automatically download results when job completes',
      defaultValue: false
    }
  },
  filter: {
    id: {
      flag: '--id <id>',
      description: 'Filter by ID'
    },
    name: {
      flag: '--name <name>',
      description: 'Filter by name'
    },
    status: {
      flag: '--status <status>',
      description: 'Filter by status'
    },
    createdAfter: {
      flag: '--created-after <date>',
      description: 'Filter by creation date (ISO format or relative like "1 day ago")'
    },
    createdBefore: {
      flag: '--created-before <date>',
      description: 'Filter by creation date (ISO format or relative like "1 day ago")'
    },
    limit: {
      flag: '--limit <number>',
      description: 'Limit number of results',
      defaultValue: 1000,
      parser: parseInt
    }
  },
  query: {
    queryFile: {
      flag: '--query-file <file>',
      description: 'Path to GraphQL query file'
    },
    query: {
      flag: '--query <query>',
      description: 'GraphQL query string'
    },
    variables: {
      flag: '--variables <json>',
      description: 'GraphQL variables as JSON string'
    },
    variablesFile: {
      flag: '--variables-file <file>',
      description: 'Path to GraphQL variables JSON file'
    }
  },
  import: {
    dryRun: {
      flag: '--dry-run',
      description: 'Validate import without actually importing',
      defaultValue: false
    },
    validateOnly: {
      flag: '--validate-only',
      description: 'Only validate the import file',
      defaultValue: false
    },
    skipErrors: {
      flag: '--skip-errors',
      description: 'Continue import even if some records fail',
      defaultValue: false
    },
    batchSize: {
      flag: '--batch-size <number>',
      description: 'Number of records to process in each batch',
      defaultValue: 1000,
      parser: parseInt
    },
    importOperation: {
      flag: '--import-operation <operation>',
      description: 'Import operation (upsert, insert, update)',
      defaultValue: 'upsert'
    }
  }
};

/**
 * Get command configuration by name
 * @param {string} commandName - The command name
 * @returns {Object|null} Command configuration
 */
function getCommandConfig(commandName) {
  return commandConfigs[commandName] || null;
}

/**
 * Get all command configurations
 * @returns {Object} All command configurations
 */
function getAllCommandConfigs() {
  return commandConfigs;
}

/**
 * Get option configuration by type
 * @param {string} optionType - The option type
 * @returns {Object|null} Option configuration
 */
function getOptionConfig(optionType) {
  return optionConfigs[optionType] || null;
}

/**
 * Get all option configurations
 * @returns {Object} All option configurations
 */
function getAllOptionConfigs() {
  return optionConfigs;
}

/**
 * Validate command configuration
 * @param {string} commandName - The command name
 * @returns {Object} Validation result
 */
function validateCommandConfig(commandName) {
  const config = getCommandConfig(commandName);
  if (!config) {
    return { valid: false, error: `Command configuration not found: ${commandName}` };
  }

  const errors = [];
  const warnings = [];

  // Check required fields
  if (!config.description) {
    errors.push('Missing description');
  }

  if (!config.category) {
    warnings.push('Missing category (will default to "general")');
  }

  // Validate options
  if (config.options) {
    for (const optionType of Object.keys(config.options)) {
      if (!optionConfigs[optionType]) {
        warnings.push(`Unknown option type: ${optionType}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config
  };
}

module.exports = {
  commandConfigs,
  optionConfigs,
  getCommandConfig,
  getAllCommandConfigs,
  getOptionConfig,
  getAllOptionConfigs,
  validateCommandConfig
}; 