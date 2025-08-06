const chalk = require('chalk');
const { PlatformCommandBuilder } = require('../../../services/platform-command');
const { LifecycleManager } = require('../../../services/lifecycle-manager');
const { ApiClientFactory } = require('../../../clients/api-client-factory');
const { ObjectValidator } = require('../../../services/validators');
const Logger = require('../../../utils/logger');
const { checkAndPromptForApiKey } = require('../../../utils/apiKeyUtils');

class CreateOrderCommand {
  constructor() {
    this.builder = new PlatformCommandBuilder('lifecycle', 'orders', 'create');
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
      Logger.info('Creating order...', options);

      // Validate input
      if (!options.json && !options.file) {
        throw new Error('Must specify --json or --file option');
      }

      // Parse order data
      const orderData = await this.parseOrderData(options);

      // Validate order data
      ObjectValidator.validate('order', orderData);

      // Setup API client
      const apiClient = await this.setupApiClient(options);
      const lifecycleManager = new LifecycleManager(apiClient);

      Logger.debug('Order data:', orderData, options);

      // Create order (only send order data, no options)
      const result = await lifecycleManager.createOrder(orderData);

      // Display creation results first
      this.displayResults(result, options);

      // Extract order ID for potential auto-activation
      const orderId = this.extractOrderId(result);

      // Auto-activate if requested
      if (options.autoActivate && orderId) {
        try {
          Logger.info('Auto-activating order...', options);
          const activationResult = await lifecycleManager.activateOrder(orderId, {
            generateInvoice: options.generateInvoice || false,
            activateInvoice: options.activateInvoice || false,
            effectiveDate: orderData.effectiveDate
          });
          Logger.success('Order activated successfully!');
          
          // Display activation status
          if (activationResult.data && activationResult.data.order) {
            const order = activationResult.data.order;
            Logger.info(`Status: ${order.status}`, options);
            if (order.orderNumber) {
              Logger.info(`Order Number: ${order.orderNumber}`, options);
            }
          }
        } catch (error) {
          Logger.error('Auto-activation failed, but order was created successfully.');
          Logger.error('You can activate the order manually using:');
          Logger.error(`nue order activate ${orderId}${options.sandbox ? ' --sandbox' : ''}`);
          process.exit(1);
        }
      }

    } catch (error) {
      Logger.error('Order creation failed: ' + error.message);
      if (options.verbose) {
        Logger.debug('Error stack:', error.stack, options);
      }
      process.exit(1);
    }
  }

  async parseOrderData(options) {
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
    const apiKey = await checkAndPromptForApiKey(options.sandbox);
    return ApiClientFactory.createClient('lifecycle', 'rest', { 
      apiKey,
      sandbox: options.sandbox 
    });
  }

  extractOrderId(result) {
    // Extract order ID from the response
    if (result && result.data && result.data.order && result.data.order.id) {
      return result.data.order.id;
    }
    if (result && result.order && result.order.id) {
      return result.order.id;
    }
    if (result && result.id) {
      return result.id;
    }
    return null;
  }

  displayResults(result, options) {
    if (options.verbose) {
      Logger.success('Order created successfully!');
      Logger.debug('Response data:', result, options);
    } else {
      Logger.success('Order created successfully!');
      
      if (result.data && result.data.order) {
        const order = result.data.order;
        Logger.info(`Order ID: ${order.id}`, options);
        Logger.info(`Status: ${order.status}`, options);
        if (order.totalAmount) {
          Logger.info(`Total Amount: $${order.totalAmount}`, options);
        }
        if (order.customer && order.customer.name) {
          Logger.info(`Customer: ${order.customer.name}`, options);
        }
      }
    }

    // Show activation instructions if not auto-activated
    if (result.data && result.data.order && result.data.order.id && !options.autoActivate) {
      const orderId = result.data.order.id;
      Logger.info(`\nTo activate this order, run:`, options);
      Logger.info(`nue lifecycle orders activate ${orderId}${options.sandbox ? ' --sandbox' : ''}`, options);
    }

    // Show invoice information if generated
    if (result.data && result.data.invoice) {
      const invoice = result.data.invoice;
      Logger.info(`\nInvoice generated: ${invoice.id}`, options);
      Logger.info(`Invoice status: ${invoice.status}`, options);
    }
  }
}

module.exports = CreateOrderCommand; 