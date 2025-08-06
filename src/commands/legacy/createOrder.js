const chalk = require('chalk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { OrderCommand } = require('../../services/builder');
const { activateOrder } = require('../../utils');

/**
 * Creates a new order using the Nue Self-Service API
 * @param {Object} program - Commander program instance
 */
module.exports = function(program) {
  const command = new OrderCommand();
  
  command.build(program, async (options) => {
    await command.executeWithErrorHandling(
      async () => {
        console.log(chalk.blue('Creating order...'));
        
        const orderPayload = await getOrderPayload(options);
        
        // API URL is the same for all environments, only the API key changes
        const apiBaseUrl = process.env.NUE_API_URL || 'https://api.nue.io';
        
        const { apiKey } = await command.setupApi(options);
        
        if (options.verbose) {
          console.log(chalk.gray('Order payload:'));
          console.log(chalk.gray(JSON.stringify(orderPayload, null, 2)));
        }
        
        // Make API call to create order
        const response = await axios.post(`${apiBaseUrl}/orders`, orderPayload, {
          headers: {
            'Content-Type': 'application/json',
            'nue-api-key': apiKey
          }
        });
        
        const orderId = extractOrderId(response);
        
        if (!options.verbose) {
          // Non-verbose mode just shows the order ID
          if (orderId) {
            console.log(chalk.green(`Order created successfully! Order ID: ${orderId}`));
          } else {
            console.log(chalk.green(`Order created successfully!`));
          }
        } else {
          // Verbose mode shows full details
          console.log(chalk.green('Order created successfully!'));
          
          if (orderId) {
            console.log(chalk.green(`Order ID: ${orderId}`));
          }
          
          console.log(chalk.green('Response data:'));
          console.log(JSON.stringify(response.data, null, 2));
        }
        
        // Auto-activate if requested
        if (options.autoActivate && orderId) {
          try {
            // Use the shared utility to activate the order
            await activateOrder(
              orderId, 
              { 
                generateInvoice: options.generateInvoice, 
                activateInvoice: options.activateInvoice,
                verbose: options.verbose
              }, 
              apiBaseUrl, 
              apiKey,
              'order'
            );
          } catch (error) {
            console.error(chalk.red('Auto-activation failed, but order was created successfully.'));
            console.error(chalk.red('You can activate the order manually using:'));
            console.error(chalk.red(`nue activate-order ${orderId}${options.sandbox ? ' --sandbox' : ''}`));
            process.exit(1);
          }
        } else if (orderId) {
          // Always show how to activate the order if it wasn't auto-activated
          console.log(chalk.blue(`To activate this order, run:`));
          console.log(chalk.blue(`nue activate-order ${orderId}${options.sandbox ? ' --sandbox' : ''}`));
        }
        
        return orderId;
      },
      options,
      'creating order',
      'order'
    );
  });
};

/**
 * Get order payload from either --json or --file options
 * @param {Object} options - Command options
 * @returns {Object} - Parsed order payload
 */
async function getOrderPayload(options) {
  if (options.json) {
    try {
      return JSON.parse(options.json);
    } catch (err) {
      throw new Error(`Error parsing JSON payload: ${err.message}`);
    }
  } else if (options.file) {
    try {
      const filePath = path.resolve(options.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    } catch (err) {
      throw new Error(`Error reading or parsing file: ${options.file} - ${err.message}`);
    }
  } else {
    throw new Error('You must provide either --json or --file option');
  }
}

/**
 * Extract order ID from API response
 * @param {Object} response - API response object
 * @returns {string|null} - Order ID or null if not found
 */
function extractOrderId(response) {
  if (response.data && response.data.data && response.data.data.order && response.data.data.order.id) {
    return response.data.data.order.id;
  } else if (response.headers && response.headers.location) {
    // Extract order ID from location header if available
    const locationParts = response.headers.location.split('/');
    return locationParts[locationParts.length - 1];
  }
  
  return null;
}