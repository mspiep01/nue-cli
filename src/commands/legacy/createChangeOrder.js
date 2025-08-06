const chalk = require('chalk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { CreateChangeOrderCommand } = require('../../services/builder');
const { activateOrder } = require('../../utils');

/**
 * Creates a new change order using the Nue Self-Service API
 * @param {Object} program - Commander program instance
 */
module.exports = function(program) {
  const command = new CreateChangeOrderCommand();
  
  command.build(program, async (options) => {
    await command.executeWithErrorHandling(
      async () => {
        console.log(chalk.blue('Creating change order...'));
        
        if (options.verbose) {
          console.log(chalk.gray('Options received:'), JSON.stringify(options, null, 2));
        }
        
        const changeOrderPayload = await getChangeOrderPayload(options);
        validateChangeOrderPayload(changeOrderPayload);
        
        // API URL is the same for all environments, only the API key changes
        const apiBaseUrl = process.env.NUE_API_URL || 'https://api.nue.io';
        
        const { apiKey } = await command.setupApi(options);
        
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
        
        const changeOrderId = extractChangeOrderId(response);
        
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
      },
      options,
      'creating change order',
      'change-order'
    );
  });
};

/**
 * Get change order payload from either --json or --file options
 * @param {Object} options - Command options
 * @returns {Object} - Parsed change order payload
 */
async function getChangeOrderPayload(options) {
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
 * Validate change order payload structure
 * @param {Object} changeOrderPayload - The payload to validate
 */
function validateChangeOrderPayload(changeOrderPayload) {
  if (!changeOrderPayload.assetChanges || !Array.isArray(changeOrderPayload.assetChanges) || changeOrderPayload.assetChanges.length === 0) {
    throw new Error('The change order payload must include an assetChanges array with at least one change');
  }
  
  // Validate each assetChange has the required fields based on changeType
  for (const change of changeOrderPayload.assetChanges) {
    if (!change.changeType) {
      throw new Error('Each asset change must have a changeType');
    }
    
    if (!change.assetNumber) {
      throw new Error('Each asset change must have an assetNumber');
    }
    
    // Specific validation based on changeType
    switch (change.changeType) {
      case 'Cancel':
        if (!change.cancellationDate) {
          throw new Error('Cancel change type requires a cancellationDate');
        }
        break;
      case 'UpdateQuantity':
        if (change.quantity === undefined) {
          throw new Error('UpdateQuantity change type requires a quantity value');
        }
        break;
      case 'UpdateTerm':
        if (!change.newTerm) {
          throw new Error('UpdateTerm change type requires a newTerm value');
        }
        break;
      case 'Renew':
        if (!change.renewalTerm) {
          throw new Error('Renew change type requires a renewalTerm value');
        }
        break;
      // Add other change types as needed
    }
  }
}

/**
 * Extract change order ID from API response
 * @param {Object} response - API response object
 * @returns {string|null} - Change order ID or null if not found
 */
function extractChangeOrderId(response) {
  // Handle different response formats
  if (response.data && response.data.data && response.data.data.order && response.data.data.order.id) {
    // Format: { status: "SUCCESS", data: { order: { id: "xxx" } } }
    return response.data.data.order.id;
  } else if (response.data && response.data.id) {
    // Format with direct ID: { id: "xxx" }
    return response.data.id;
  } else if (response.headers && response.headers.location) {
    // Extract ID from location header if available
    const locationParts = response.headers.location.split('/');
    return locationParts[locationParts.length - 1];
  }
  
  return null;
}