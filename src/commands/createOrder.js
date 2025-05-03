const chalk = require('chalk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { checkAndPromptForApiKey } = require('../utils/apiKeyUtils');
const { activateOrder } = require('../utils/orderUtils');

/**
 * Creates a new order using the Nue Self-Service API
 * @param {Object} program - Commander program instance
 */
module.exports = function(program) {
  program
    .command('create-order')
    .description('Create a new order in the Nue platform')
    .option('--sandbox', 'Use sandbox environment', false)
    .option('--json <json>', 'JSON payload for the order')
    .option('--file <path>', 'Path to JSON file containing the order payload')
    .option('--auto-activate', 'Automatically activate the order after creation', false)
    .option('--generate-invoice', 'Generate invoice during activation (requires --auto-activate)', false)
    .option('--activate-invoice', 'Activate invoice during activation (requires --auto-activate)', false)
    .option('--verbose', 'Show detailed output information', false)
    .action(async (options) => {
      try {
        if (options.verbose) {
          console.log(chalk.blue('Creating new order...'));
        } else {
          console.log(chalk.blue('Creating order...'));
        }
        
        let orderPayload;
        
        // Get payload from either --json or --file
        if (options.json) {
          try {
            orderPayload = JSON.parse(options.json);
          } catch (err) {
            console.error(chalk.red('Error parsing JSON payload:'));
            console.error(chalk.red(err.message));
            process.exit(1);
          }
        } else if (options.file) {
          try {
            const filePath = path.resolve(options.file);
            if (!fs.existsSync(filePath)) {
              console.error(chalk.red(`File not found: ${filePath}`));
              process.exit(1);
            }
            
            const fileContent = fs.readFileSync(filePath, 'utf8');
            orderPayload = JSON.parse(fileContent);
          } catch (err) {
            console.error(chalk.red(`Error reading or parsing file: ${options.file}`));
            console.error(chalk.red(err.message));
            process.exit(1);
          }
        } else {
          console.error(chalk.red('Error: You must provide either --json or --file option'));
          process.exit(1);
        }
        
        // API URL is the same for all environments, only the API key changes
        const apiBaseUrl = process.env.NUE_API_URL || 'https://api.nue.io';
        
        // Use the utility to check for the API key and prompt if not found
        const apiKey = await checkAndPromptForApiKey(options.sandbox);
        
        if (!apiKey) {
          console.error(chalk.red(`Unable to proceed without API key`));
          process.exit(1);
        }
        
        if (options.verbose) {
          console.log(chalk.gray('Order payload:'));
          console.log(chalk.gray(JSON.stringify(orderPayload, null, 2)));
        }
        
        // Make API call to create order
        const response = await axios.post(`${apiBaseUrl}/v1/orders`, orderPayload, {
          headers: {
            'Content-Type': 'application/json',
            'nue-api-key': apiKey
          }
        });
        
        // Extract order ID from response
        let orderId = null;
        if (response.data && response.data.data && response.data.data.order && response.data.data.order.id) {
          orderId = response.data.data.order.id;
        } else if (response.headers && response.headers.location) {
          // Extract order ID from location header if available
          const locationParts = response.headers.location.split('/');
          orderId = locationParts[locationParts.length - 1];
        }
        
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
      } catch (error) {
        console.error(chalk.red('Error creating order:'));
        if (error.response) {
          if (options.verbose) {
            console.error(chalk.red(`Status: ${error.response.status}`));
            console.error(chalk.red(JSON.stringify(error.response.data, null, 2)));
          } else {
            console.error(chalk.red(`Status: ${error.response.status}`));
            if (error.response.data && error.response.data.error) {
              console.error(chalk.red(error.response.data.error));
            }
          }
        } else {
          console.error(chalk.red(error.message));
        }
        process.exit(1);
      }
    });
};