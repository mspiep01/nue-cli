const chalk = require('chalk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { checkAndPromptForApiKey } = require('../utils/apiKeyUtils');
const { activateOrder } = require('../utils/orderUtils');

/**
 * Creates a new change order using the Nue Self-Service API
 * @param {Object} program - Commander program instance
 */
module.exports = function(program) {
  program
    .command('create-change-order')
    .description('Create a new change order in the Nue platform')
    .option('--sandbox', 'Use sandbox environment', false)
    .option('--json <json>', 'JSON payload for the change order')
    .option('--file <path>', 'Path to JSON file containing the change order payload')
    .option('--auto-activate', 'Automatically activate the change order after creation', false)
    .option('--generate-invoice', 'Generate invoice during activation (requires --auto-activate)', false)
    .option('--activate-invoice', 'Activate invoice during activation (requires --auto-activate)', false)
    .option('--verbose', 'Show detailed output information', false)
    .action(async (options) => {
      try {
        if (options.verbose) {
          console.log(chalk.blue('Creating new change order...'));
          // For debugging
          console.log(chalk.gray('Options received:'), JSON.stringify(options, null, 2));
        } else {
          console.log(chalk.blue('Creating change order...'));
        }
        
        let changeOrderPayload;
        
        // Get payload from either --json or --file
        if (options.json) {
          try {
            changeOrderPayload = JSON.parse(options.json);
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
            changeOrderPayload = JSON.parse(fileContent);
          } catch (err) {
            console.error(chalk.red(`Error reading or parsing file: ${options.file}`));
            console.error(chalk.red(err.message));
            process.exit(1);
          }
        } else {
          console.error(chalk.red('Error: You must provide either --json or --file option'));
          process.exit(1);
        }
        
        // Validate payload has required fields
        if (!changeOrderPayload.assetChanges || !Array.isArray(changeOrderPayload.assetChanges) || changeOrderPayload.assetChanges.length === 0) {
          console.error(chalk.red('Error: The change order payload must include an assetChanges array with at least one change'));
          process.exit(1);
        }
        
        // Validate each assetChange has the required fields based on changeType
        for (const change of changeOrderPayload.assetChanges) {
          if (!change.changeType) {
            console.error(chalk.red('Error: Each asset change must have a changeType'));
            process.exit(1);
          }
          
          if (!change.assetNumber) {
            console.error(chalk.red('Error: Each asset change must have an assetNumber'));
            process.exit(1);
          }
          
          // Specific validation based on changeType
          switch (change.changeType) {
            case 'Cancel':
              if (!change.cancellationDate) {
                console.error(chalk.red('Error: Cancel change type requires a cancellationDate'));
                process.exit(1);
              }
              break;
            case 'UpdateQuantity':
              if (change.quantity === undefined) {
                console.error(chalk.red('Error: UpdateQuantity change type requires a quantity value'));
                process.exit(1);
              }
              break;
            case 'UpdateTerm':
              if (!change.newTerm) {
                console.error(chalk.red('Error: UpdateTerm change type requires a newTerm value'));
                process.exit(1);
              }
              break;
            case 'Renew':
              if (!change.renewalTerm) {
                console.error(chalk.red('Error: Renew change type requires a renewalTerm value'));
                process.exit(1);
              }
              break;
            // Add other change types as needed
          }
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
          console.log(chalk.gray('Change order payload:'));
          console.log(chalk.gray(JSON.stringify(changeOrderPayload, null, 2)));
        }
        
        // Make API call to create change order
        const response = await axios.post(`${apiBaseUrl}/change-orders`, changeOrderPayload, {
          headers: {
            'Content-Type': 'application/json',
            'nue-api-key': apiKey
          }
        });
        
        // Extract change order ID from response
        let changeOrderId = null;
        
        // Handle different response formats
        if (response.data && response.data.data && response.data.data.order && response.data.data.order.id) {
          // Format: { status: "SUCCESS", data: { order: { id: "xxx" } } }
          changeOrderId = response.data.data.order.id;
        } else if (response.data && response.data.id) {
          // Format with direct ID: { id: "xxx" }
          changeOrderId = response.data.id;
        } else if (response.headers && response.headers.location) {
          // Extract ID from location header if available
          const locationParts = response.headers.location.split('/');
          changeOrderId = locationParts[locationParts.length - 1];
        }
        
        // Always display the change order ID clearly (for both verbose and non-verbose mode)
        console.log(chalk.green(`Change order created successfully!`));
        
        if (changeOrderId) {
          console.log(chalk.green.bold(`Change Order ID: ${changeOrderId}`));
        } else {
          console.log(chalk.yellow('Warning: Could not extract change order ID from response'));
          if (options.verbose) {
            console.log(chalk.yellow('Response structure:'));
            console.log(JSON.stringify(response.data, null, 2));
          }
        }
        
        if (options.verbose && response.data) {
          console.log(chalk.green('Response data:'));
          console.log(JSON.stringify(response.data, null, 2));
        }
        
        // Auto-activate if requested
        if (options.autoActivate === true && changeOrderId) {
          if (options.verbose) {
            console.log(chalk.blue(`Auto-activation requested for change order: ${changeOrderId}`));
          }
          
          try {
            // Use the shared utility to activate the change order
            await activateOrder(
              changeOrderId, 
              { 
                generateInvoice: options.generateInvoice, 
                activateInvoice: options.activateInvoice,
                verbose: options.verbose
              }, 
              apiBaseUrl, 
              apiKey,
              'change-order'
            );
          } catch (error) {
            console.error(chalk.red('Auto-activation failed, but change order was created successfully.'));
            console.error(chalk.red('You can activate the change order manually using:'));
            console.error(chalk.red(`nue activate-change-order ${changeOrderId}${options.sandbox ? ' --sandbox' : ''}`));
            process.exit(1);
          }
        } else if (changeOrderId) {
          // Always show how to activate the change order if it wasn't auto-activated
          console.log(chalk.blue(`To activate this change order, run:`));
          console.log(chalk.blue(`nue activate-change-order ${changeOrderId}${options.sandbox ? ' --sandbox' : ''}`));
        }
        
        return changeOrderId;
      } catch (error) {
        console.error(chalk.red('Error creating change order:'));
        if (error.response) {
          if (options.verbose) {
            console.error(chalk.red(`Status: ${error.response.status}`));
            console.error(chalk.red(JSON.stringify(error.response.data, null, 2)));
          } else {
            console.error(chalk.red(`Status: ${error.response.status}`));
            if (error.response.data && error.response.data.error) {
              console.error(chalk.red(error.response.data.error));
            } else if (error.response.data && error.response.data.message) {
              console.error(chalk.red(error.response.data.message));
            }
          }
        } else {
          console.error(chalk.red(error.message));
        }
        process.exit(1);
      }
    });
};