const chalk = require('chalk');
const { PlatformCommandBuilder } = require('../../../services/platform-command');
const { LifecycleManager } = require('../../../services/lifecycle-manager');
const { ApiClientFactory } = require('../../../clients/api-client-factory');
const { checkAndPromptForApiKey } = require('../../../utils/apiKeyUtils');

class ActivateOrderCommand {
  constructor() {
    this.builder = new PlatformCommandBuilder('lifecycle', 'orders', 'activate');
  }

  register(program) {
    this.builder
      .addLifecycleOptions()
      .addCommonOptions()
      .build(program)
      .argument('<orderId>', 'Order ID to activate')
      .action(this.handleAction.bind(this));
  }

  async handleAction(orderId, options) {
    try {
      console.log(chalk.blue(`Activating order ${orderId}...`));

      // Setup API client
      const apiClient = await this.setupApiClient(options);
      const lifecycleManager = new LifecycleManager(apiClient);

      // Parse activation data from JSON if provided, otherwise use default options
      let activationData;
      if (options.json) {
        activationData = JSON.parse(options.json);
        if (options.verbose) {
          console.log(chalk.gray('Activation data:'));
          console.log(chalk.gray(JSON.stringify(activationData, null, 2)));
        }
      } else {
        // Prepare default activation options
        activationData = {
          options: {
            generateInvoice: options.generateInvoice || false,
            activateInvoice: options.activateInvoice || false
          },
          paymentMethodObject: {}
        };
        
        if (options.verbose) {
          console.log(chalk.gray('Activation options:'));
          console.log(chalk.gray(JSON.stringify(activationData, null, 2)));
        }
      }

      // Activate order
      const result = await lifecycleManager.activateOrder(orderId, activationData);

      // Display results
      this.displayResults(result, options);

    } catch (error) {
      console.error(chalk.red('Order activation failed:'), error.message);
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

  displayResults(result, options) {
    if (options.verbose) {
      console.log(chalk.green('Order activated successfully!'));
      console.log(chalk.green('Response data:'));
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green('Order activated successfully!'));
      
      if (result.data && result.data.order) {
        const order = result.data.order;
        console.log(chalk.blue(`Order ID: ${order.id}`));
        console.log(chalk.blue(`Status: ${order.status}`));
      }
    }

    // Show invoice information if generated
    if (result.data && result.data.invoice) {
      const invoice = result.data.invoice;
      console.log(chalk.blue(`\nInvoice generated: ${invoice.id}`));
      console.log(chalk.blue(`Invoice status: ${invoice.status}`));
    }
  }
}

module.exports = ActivateOrderCommand; 