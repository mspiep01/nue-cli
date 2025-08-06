const chalk = require('chalk');
const { PlatformCommandBuilder } = require('../../../services/platform-command');
const { LifecycleManager } = require('../../../services/lifecycle-manager');
const { ApiClientFactory } = require('../../../clients/api-client-factory');
const { checkAndPromptForApiKey } = require('../../../utils/apiKeyUtils');

class GetOrderCommand {
  constructor() {
    this.builder = new PlatformCommandBuilder('lifecycle', 'orders', 'get');
  }

  register(program) {
    this.builder
      .addLifecycleOptions()
      .addCommonOptions()
      .build(program)
      .argument('[orderId]', 'Order ID to retrieve (optional for listing)')
      .action(this.handleAction.bind(this));
  }

  async handleAction(orderId, options) {
    try {
      if (orderId) {
        console.log(chalk.blue(`Getting order ${orderId}...`));
      } else {
        console.log(chalk.blue('Getting orders...'));
      }

      // Setup API client
      const apiClient = await this.setupApiClient(options);
      const lifecycleManager = new LifecycleManager(apiClient);

      // Prepare query options
      const queryOptions = {
        includeCustomer: options.includeCustomer || false,
        includeProducts: options.includeProducts || false,
        includeInvoice: options.includeInvoice || false,
        status: options.status,
        ...options.filters
      };

      if (options.verbose) {
        console.log(chalk.gray('Query options:'));
        console.log(chalk.gray(JSON.stringify(queryOptions, null, 2)));
      }

      // Get order(s)
      const result = await lifecycleManager.getOrder(orderId, queryOptions);

      // Display results
      this.displayResults(result, options, orderId);

    } catch (error) {
      console.error(chalk.red('Failed to get order(s):'), error.message);
      if (options.verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  }

  async setupApiClient(options) {
    const apiKey = await checkAndPromptForApiKey(options.sandbox);
    return ApiClientFactory.createClient('lifecycle', 'rest', { 
      apiKey,
      sandbox: options.sandbox 
    });
  }

  displayResults(result, options, orderId) {
    if (options.verbose) {
      console.log(chalk.green('Order data retrieved successfully!'));
      console.log(chalk.green('Response data:'));
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (orderId) {
        // Single order
        if (result.data && result.data.order) {
          const order = result.data.order;
          console.log(chalk.green('Order retrieved successfully!'));
          console.log(chalk.blue(`Order ID: ${order.id}`));
          console.log(chalk.blue(`Status: ${order.status}`));
          if (order.totalAmount) {
            console.log(chalk.blue(`Total Amount: $${order.totalAmount}`));
          }
          if (order.customer && order.customer.name) {
            console.log(chalk.blue(`Customer: ${order.customer.name}`));
          }
        }
      } else {
        // List of orders
        if (result.data && result.data.orders) {
          const orders = result.data.orders;
          console.log(chalk.green(`Retrieved ${orders.length} orders:`));
          orders.forEach(order => {
            console.log(chalk.blue(`  ${order.id} - ${order.status} - $${order.totalAmount || 0}`));
          });
        }
      }
    }

    // Show file output if specified
    if (options.output) {
      console.log(chalk.blue(`Results saved to: ${options.output}`));
    }
  }
}

module.exports = GetOrderCommand; 