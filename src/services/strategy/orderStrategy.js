const { BaseCommand } = require('../builder/commandBuilder');
const { ApiClient } = require('../../utils');

/**
 * Order Strategy for handling order-related operations
 */
class OrderStrategy {
  constructor(options = {}, apiClient = null) {
    this.options = options;
    this.apiClient = apiClient || new ApiClient();
    this.metadata = {
      type: 'order',
      description: 'Strategy for order management operations',
      supportedOperations: ['create', 'activate', 'change'],
      requiredOptions: ['apiKey'],
      optionalOptions: ['sandbox', 'verbose', 'autoActivate'],
      examples: [
        'nue create-order --file order.json --auto-activate',
        'nue activate-order order-123 --generate-invoice'
      ]
    };
  }

  /**
   * Execute the order strategy
   * @param {Object} options - Command options
   */
  async execute(options) {
    const operation = this.determineOperation(options);
    
    switch (operation) {
      case 'create':
        return await this.createOrder(options);
      case 'activate':
        return await this.activateOrder(options);
      case 'change':
        return await this.createChangeOrder(options);
      default:
        throw new Error(`Unknown order operation: ${operation}`);
    }
  }

  /**
   * Determine the operation based on options
   * @param {Object} options - Command options
   * @returns {string} Operation type
   */
  determineOperation(options) {
    if (options.orderId || options.changeOrderId) {
      return 'activate';
    }
    
    if (options.changeOrder) {
      return 'change';
    }
    
    return 'create';
  }

  /**
   * Create a new order
   * @param {Object} options - Command options
   */
  async createOrder(options) {
    console.log('Creating order...');
    
    const orderData = await this.getOrderData(options);
    const response = await this.apiClient.post('/orders', orderData);
    
    console.log(`Order created successfully! Order ID: ${response.data.id}`);
    
    if (options.autoActivate) {
      await this.activateOrder({ ...options, orderId: response.data.id });
    }
    
    return response.data;
  }

  /**
   * Activate an order
   * @param {Object} options - Command options
   */
  async activateOrder(options) {
    const orderId = options.orderId || options.changeOrderId;
    console.log(`Activating order: ${orderId}`);
    
    const activationData = {
      generateInvoice: options.generateInvoice || false,
      activateInvoice: options.activateInvoice || false
    };
    
    const response = await this.apiClient.post(`/orders/${orderId}`, activationData);
    
    console.log(`Order activated successfully!`);
    return response.data;
  }

  /**
   * Create a change order
   * @param {Object} options - Command options
   */
  async createChangeOrder(options) {
    console.log('Creating change order...');
    
    const changeOrderData = await this.getOrderData(options);
    const response = await this.apiClient.post('/v1/change-orders', changeOrderData);
    
    console.log(`Change order created successfully! Change Order ID: ${response.data.id}`);
    
    if (options.autoActivate) {
      await this.activateOrder({ ...options, changeOrderId: response.data.id });
    }
    
    return response.data;
  }

  /**
   * Get order data from options
   * @param {Object} options - Command options
   * @returns {Object} Order data
   */
  async getOrderData(options) {
    if (options.json) {
      return JSON.parse(options.json);
    }
    
    if (options.file) {
      const fs = require('fs');
      const fileContent = fs.readFileSync(options.file, 'utf8');
      return JSON.parse(fileContent);
    }
    
    throw new Error('Must provide --json or --file option');
  }
}

/**
 * Order Strategy Factory
 * @param {Object} options - Strategy options
 * @param {Object} apiClient - API client instance
 * @returns {OrderStrategy} Order strategy instance
 */
function OrderStrategyFactory(options, apiClient) {
  return new OrderStrategy(options, apiClient);
}

// Export with metadata for auto-registration
OrderStrategyFactory.metadata = {
  type: 'order',
  description: 'Strategy for order management operations',
  supportedOperations: ['create', 'activate', 'change'],
  requiredOptions: ['apiKey'],
  optionalOptions: ['sandbox', 'verbose', 'autoActivate'],
  command: {
    name: 'order',
    description: 'Order management operations',
    options: {
      json: {
        flag: '--json <json>',
        description: 'Order data as JSON string'
      },
      file: {
        flag: '--file <file>',
        description: 'Path to JSON file containing order data'
      },
      autoActivate: {
        flag: '--auto-activate',
        description: 'Automatically activate after creation',
        defaultValue: false
      }
    }
  }
};

module.exports = {
  OrderStrategy,
  OrderStrategyFactory
}; 