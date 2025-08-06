const { checkAndPromptForApiKey } = require('../utils/apiKeyUtils');

class PlatformCommandBuilder {
  constructor(platform, resource, action) {
    this.platform = platform; // 'platform', 'lifecycle', 'billing', 'integrations'
    this.resource = resource;
    this.action = action;
    this.options = new Map();
  }

  // Platform-specific options
  addPlatformOptions() {
    // Add platform options based on the action type
    if (this.action === 'query') {
      return this
        .option('--schema', 'Include schema information')
        .option('--format <format>', 'Output format (json, yaml, xml)', 'json')
        .option('--filters <json>', 'JSON filters for operations');
    } else if (this.action === 'export') {
      return this
        .option('--object-type <type>', 'Object type for metadata operations')
        .option('--all', 'Apply to all objects (for export/import)')
        .option('--metadata', 'Include metadata in response')
        .option('--format <format>', 'Output format (json, yaml, xml)', 'json')
        .option('--filters <json>', 'JSON filters for operations');
    } else if (this.action === 'import') {
      return this
        .option('--object-type <type>', 'Object type for metadata operations')
        .option('--all', 'Apply to all objects (for export/import)')
        .option('--overwrite', 'Overwrite existing data')
        .option('--validate-only', 'Validate without making changes')
        .option('--dry-run', 'Simulate operation without changes');
    } else {
      // For other actions, include all platform options
      return this
        .option('--object-type <type>', 'Object type for metadata operations')
        .option('--all', 'Apply to all objects (for export/import)')
        .option('--metadata', 'Include metadata in response')
        .option('--schema', 'Include schema information')
        .option('--format <format>', 'Output format (json, yaml, xml)', 'json')
        .option('--filters <json>', 'JSON filters for operations')
        .option('--validate-only', 'Validate without making changes')
        .option('--dry-run', 'Simulate operation without changes')
        .option('--overwrite', 'Overwrite existing data');
    }
  }

  addLifecycleOptions() {
    // Add lifecycle options based on the action type
    if (this.action === 'create') {
      return this
        .option('--auto-activate', 'Auto-activate after creation')
        .option('--generate-invoice', 'Generate invoice after activation')
        .option('--activate-invoice', 'Activate invoice after generation');
    } else if (this.action === 'activate') {
      return this
        .option('--generate-invoice', 'Generate invoice after activation')
        .option('--activate-invoice', 'Activate invoice after generation');
    } else if (this.action === 'get') {
      return this
        .option('--customer-id <id>', 'Customer ID')
        .option('--subscription-id <id>', 'Subscription ID')
        .option('--order-id <id>', 'Order ID')
        .option('--status <status>', 'Filter by status')
        .option('--effective-date <date>', 'Effective date for operations');
    } else {
      // For other actions, include all lifecycle options
      return this
        .option('--customer-id <id>', 'Customer ID')
        .option('--subscription-id <id>', 'Subscription ID')
        .option('--order-id <id>', 'Order ID')
        .option('--status <status>', 'Filter by status')
        .option('--effective-date <date>', 'Effective date for operations')
        .option('--auto-activate', 'Auto-activate after creation')
        .option('--generate-invoice', 'Generate invoice after activation')
        .option('--activate-invoice', 'Activate invoice after generation');
    }
  }

  addBillingOptions() {
    return this
      .option('--billing-account <id>', 'Billing account ID')
      .option('--invoice-id <id>', 'Invoice ID')
      .option('--payment-id <id>', 'Payment ID')
      .option('--invoice-date <date>', 'Invoice date')
      .option('--payment-method <method>', 'Payment method')
      .option('--amount <amount>', 'Amount for billing operations')
      .option('--currency <currency>', 'Currency code', 'USD')
      .option('--credit-limit <limit>', 'Credit limit amount');
  }

  addIntegrationOptions() {
    return this
      .option('--provider <provider>', 'Integration provider (stripe, salesforce, etc.)')
      .option('--webhook-url <url>', 'Webhook URL')
      .option('--sync-mode <mode>', 'Sync mode (real-time, batch)', 'real-time')
      .option('--events <events>', 'Comma-separated list of events')
      .option('--objects <objects>', 'Comma-separated list of objects to sync')
      .option('--api-version <version>', 'API version for integration');
  }

  addJobOptions() {
    return this
      .option('--job-id <id>', 'Job ID for status/management')
      .option('--job-type <type>', 'Job type (export, import, sync)')
      .option('--priority <priority>', 'Job priority (low, normal, high)', 'normal')
      .option('--timeout <seconds>', 'Job timeout in seconds', '3600')
      .option('--retry-count <count>', 'Number of retry attempts', '3');
  }

  addCommonOptions() {
    // Add common options based on the action type
    if (this.action === 'create' || this.action === 'activate') {
      return this
        .option('--sandbox', 'Use sandbox environment')
        .option('--verbose', 'Show detailed output')
        .option('--output <file>', 'Output file path')
        .option('--json <data>', 'Input data as JSON string')
        .option('--file <path>', 'Input file path');
    } else if (this.action === 'get') {
      return this
        .option('--sandbox', 'Use sandbox environment')
        .option('--verbose', 'Show detailed output')
        .option('--output <file>', 'Output file path');
    } else if (this.action === 'query') {
      return this
        .option('--sandbox', 'Use sandbox environment')
        .option('--verbose', 'Show detailed output')
        .option('--output <file>', 'Output file path')
        .option('--query <query>', 'GraphQL query string')
        .option('--variables <json>', 'GraphQL variables as JSON')
        .option('--operation-name <name>', 'GraphQL operation name')
        .option('--file <path>', 'Input file path');
    } else if (this.action === 'export') {
      return this
        .option('--sandbox', 'Use sandbox environment')
        .option('--verbose', 'Show detailed output')
        .option('--output <file>', 'Output file path')
        .option('--wait', 'Wait for job completion and show progress')
        .option('--download <jobId>', 'Download results from a completed job');
    } else if (this.action === 'import') {
      return this
        .option('--sandbox', 'Use sandbox environment')
        .option('--verbose', 'Show detailed output')
        .option('--output <file>', 'Output file path')
        .option('--json <data>', 'Input data as JSON string')
        .option('--file <path>', 'Input file path')
        .option('--export-job-id <jobId>', 'Import from export job ID (automatically finds downloaded files)')
        .option('--all-objects', 'Import all available objects from export job', false);
    } else {
      // For other actions, include all common options
      return this
        .option('--sandbox', 'Use sandbox environment')
        .option('--verbose', 'Show detailed output')
        .option('--output <file>', 'Output file path')
        .option('--json <data>', 'Input data as JSON string')
        .option('--file <path>', 'Input file path')
        .option('--query <query>', 'GraphQL query string')
        .option('--variables <json>', 'GraphQL variables as JSON')
        .option('--operation-name <name>', 'GraphQL operation name')
        .option('--wait', 'Wait for job completion and show progress')
        .option('--download <jobId>', 'Download results from a completed job')
        .option('--export-job-id <jobId>', 'Import from export job ID (automatically finds downloaded files)')
        .option('--all-objects', 'Import all available objects from export job', false);
    }
  }

  option(flag, description, defaultValue) {
    this.options.set(flag, { description, defaultValue });
    return this;
  }

  build(program) {
    const commandName = `${this.action}`;
    const command = program.command(commandName);
    
    // Add platform-specific options
    this[`add${this.platform.charAt(0).toUpperCase() + this.platform.slice(1)}Options`]();
    
    // Add common options
    this.addCommonOptions();
    
    // Register all options with the command
    for (const [flag, config] of this.options) {
      if (config.defaultValue !== undefined) {
        command.option(flag, config.description, config.defaultValue);
      } else {
        command.option(flag, config.description);
      }
    }
    
    return command;
  }

  async setupApi(options) {
    const apiKey = await checkAndPromptForApiKey(options.sandbox);
    return { apiKey };
  }
}

module.exports = { PlatformCommandBuilder }; 