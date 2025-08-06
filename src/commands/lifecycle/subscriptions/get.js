const chalk = require('chalk');
const { PlatformCommandBuilder } = require('../../../services/platform-command');
const { LifecycleManager } = require('../../../services/lifecycle-manager');
const { ApiClientFactory } = require('../../../clients/api-client-factory');
const { checkAndPromptForApiKey } = require('../../../utils/apiKeyUtils');

class GetSubscriptionsCommand {
  constructor() {
    this.builder = new PlatformCommandBuilder('lifecycle', 'subscriptions', 'get');
  }

  register(program) {
    this.builder
      .addLifecycleOptions()
      .addCommonOptions()
      .build(program)
      .argument('[subscriptionId]', 'Subscription ID to retrieve (optional for listing)')
      .action(this.handleAction.bind(this));
  }

  async handleAction(subscriptionId, options) {
    try {
      if (subscriptionId) {
        console.log(chalk.blue(`Getting subscription ${subscriptionId}...`));
      } else {
        console.log(chalk.blue('Getting subscriptions...'));
      }

      // Setup API client
      const apiClient = await this.setupApiClient(options);
      const lifecycleManager = new LifecycleManager(apiClient);

      // Prepare query options
      const queryOptions = {
        customerId: options.customerId,
        status: options.status,
        includeCustomer: options.includeCustomer || false,
        includeProducts: options.includeProducts || false,
        includeUsage: options.includeUsage || false,
        ...options.filters
      };

      if (options.verbose) {
        console.log(chalk.gray('Query options:'));
        console.log(chalk.gray(JSON.stringify(queryOptions, null, 2)));
      }

      // Get subscription(s)
      let result;
      if (subscriptionId) {
        result = await lifecycleManager.getSubscription(subscriptionId, queryOptions);
      } else {
        result = await lifecycleManager.getSubscriptions(queryOptions);
      }

      // Display results
      this.displayResults(result, options, subscriptionId);

    } catch (error) {
      console.error(chalk.red('Failed to get subscription(s):'), error.message);
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

  displayResults(result, options, subscriptionId) {
    if (options.verbose) {
      console.log(chalk.green('Subscription data retrieved successfully!'));
      console.log(chalk.green('Response data:'));
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (subscriptionId) {
        // Single subscription
        if (result.data && result.data.subscription) {
          const subscription = result.data.subscription;
          console.log(chalk.green('Subscription retrieved successfully!'));
          console.log(chalk.blue(`Subscription ID: ${subscription.id}`));
          console.log(chalk.blue(`Status: ${subscription.status}`));
          if (subscription.customer && subscription.customer.name) {
            console.log(chalk.blue(`Customer: ${subscription.customer.name}`));
          }
          if (subscription.products && subscription.products.length > 0) {
            console.log(chalk.blue(`Products: ${subscription.products.length} items`));
          }
        }
      } else {
        // List of subscriptions
        if (result.data && result.data.subscriptions) {
          const subscriptions = result.data.subscriptions;
          console.log(chalk.green(`Retrieved ${subscriptions.length} subscriptions:`));
          subscriptions.forEach(subscription => {
            const customerName = subscription.customer ? subscription.customer.name : 'Unknown';
            console.log(chalk.blue(`  ${subscription.id} - ${subscription.status} - ${customerName}`));
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

module.exports = GetSubscriptionsCommand; 