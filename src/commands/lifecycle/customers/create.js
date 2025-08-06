const chalk = require('chalk');
const { PlatformCommandBuilder } = require('../../../services/platform-command');
const { LifecycleManager } = require('../../../services/lifecycle-manager');
const { ApiClientFactory } = require('../../../clients/api-client-factory');
const { ObjectValidator } = require('../../../services/validators');

class CreateCustomerCommand {
  constructor() {
    this.builder = new PlatformCommandBuilder('lifecycle', 'customers', 'create');
  }

  register(program) {
    this.builder
      .addLifecycleOptions()
      .addCommonOptions()
      .build(program)
      .action(this.handleAction.bind(this));
  }

  async handleAction(options) {
    try {
      console.log(chalk.blue('Creating customer...'));

      // Validate input
      if (!options.json && !options.file) {
        throw new Error('Must specify --json or --file option');
      }

      // Parse customer data
      const customerData = await this.parseCustomerData(options);

      // Validate customer data
      ObjectValidator.validate('customer', customerData);

      // Setup API client
      const apiClient = await this.setupApiClient(options);
      const lifecycleManager = new LifecycleManager(apiClient);

      if (options.verbose) {
        console.log(chalk.gray('Customer data:'));
        console.log(chalk.gray(JSON.stringify(customerData, null, 2)));
      }

      // Create customer
      const result = await lifecycleManager.createCustomer(customerData, {
        validateOnly: options.validateOnly || false
      });

      // Display results
      this.displayResults(result, options);

    } catch (error) {
      console.error(chalk.red('Customer creation failed:'), error.message);
      if (options.verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  }

  async parseCustomerData(options) {
    if (options.json) {
      return JSON.parse(options.json);
    } else if (options.file) {
      const fs = require('fs');
      const fileContent = fs.readFileSync(options.file, 'utf8');
      return JSON.parse(fileContent);
    }
    throw new Error('Invalid data source');
  }

  async setupApiClient(options) {
    const { apiKey } = await this.builder.setupApi(options);
    return ApiClientFactory.createClient('lifecycle', 'rest', { apiKey });
  }

  displayResults(result, options) {
    if (options.verbose) {
      console.log(chalk.green('Customer created successfully!'));
      console.log(chalk.green('Response data:'));
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green('Customer created successfully!'));
      
      if (result.data && result.data.customer) {
        const customer = result.data.customer;
        console.log(chalk.blue(`Customer ID: ${customer.id}`));
        console.log(chalk.blue(`Name: ${customer.name}`));
        if (customer.email) {
          console.log(chalk.blue(`Email: ${customer.email}`));
        }
      }
    }

    // Show next steps
    if (result.data && result.data.customer && result.data.customer.id) {
      const customerId = result.data.customer.id;
      console.log(chalk.blue(`\nTo create an order for this customer, run:`));
      console.log(chalk.blue(`nue lifecycle orders create --customer-id ${customerId} --json '{"orderProducts":[...]}'`));
    }
  }
}

module.exports = CreateCustomerCommand; 