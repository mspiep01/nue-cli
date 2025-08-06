const chalk = require('chalk');
const axios = require('axios');

/**
 * Activates an order or change order in the Nue platform
 * @param {string} id - Order ID or Change Order ID
 * @param {Object} options - Command options
 * @param {string} apiBaseUrl - API base URL
 * @param {string} apiKey - Nue API key
 * @param {string} orderType - Type of order: 'order' or 'change-order'
 * @returns {Promise<Object>} - API response
 */
async function activateOrder(id, options, apiBaseUrl, apiKey, orderType = 'order') {
  try {
    const isChangeOrder = orderType === 'change-order';
    const entityName = isChangeOrder ? 'change order' : 'order';
    
    if (options.verbose) {
      console.log(chalk.blue(`Activating ${entityName}: ${id}...`));
    } else {
      console.log(chalk.blue(`Activating ${entityName}...`));
    }
    
    // Build activation payload
    const activationPayload = {
      options: {
        generateInvoice: options.generateInvoice || false,
        activateInvoice: options.activateInvoice || false
      }
    };
    
    if (options.verbose) {
      console.log(chalk.gray('Activation payload:'));
      console.log(chalk.gray(JSON.stringify(activationPayload, null, 2)));
    }
    
    // API endpoint differs based on order type
    const endpoint = isChangeOrder 
      ? `${apiBaseUrl}/orders/${id}`
      : `${apiBaseUrl}/orders/${id}`;
    
    // Make API call
    const response = await axios.post(endpoint, activationPayload, {
      headers: {
        'Content-Type': 'application/json',
        'nue-api-key': apiKey
      }
    });
    
    if (options.verbose) {
      console.log(chalk.green(`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} activated successfully!`));
      console.log(chalk.green(`Response status: ${response.status}`));
      if (response.data) {
        console.log(chalk.green('Response data:'));
        console.log(JSON.stringify(response.data, null, 2));
      }
    } else {
      console.log(chalk.green(`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} activated successfully!`));
      
      // Display type-specific information
      if (isChangeOrder) {
        // For change orders - show affected assets if available
        if (response.data && 
            response.data.affectedAssets && 
            Array.isArray(response.data.affectedAssets) && 
            response.data.affectedAssets.length > 0) {
          
          console.log(chalk.green('\nAffected Assets:'));
          console.log(chalk.green('---------------------------'));
          
          response.data.affectedAssets.forEach((asset, index) => {
            console.log(chalk.green(`Asset #${index + 1}:`));
            console.log(chalk.green(`ID: ${asset.id || 'N/A'}`));
            console.log(chalk.green(`Number: ${asset.assetNumber || 'N/A'}`));
            console.log(chalk.green(`Status: ${asset.status || 'N/A'}`));
            if (asset.changeType) {
              console.log(chalk.green(`Change Type: ${asset.changeType}`));
            }
            console.log(chalk.green('---------------------------'));
          });
          
          console.log(chalk.green(`Total Affected Assets: ${response.data.affectedAssets.length}`));
        }
      } else {
        // For regular orders - show subscription information
        if (response.data && 
            response.data.data && 
            response.data.data.subscriptions && 
            response.data.data.subscriptions.length > 0) {
          
          console.log(chalk.green('\nSubscription Information:'));
          console.log(chalk.green('---------------------------'));
          
          response.data.data.subscriptions.forEach((subscription, index) => {
            console.log(chalk.green(`Subscription #${index + 1}:`));
            console.log(chalk.green(`ID: ${subscription.id}`));
            console.log(chalk.green(`Name: ${subscription.name}`));
            console.log(chalk.green(`Status: ${subscription.status}`));
            console.log(chalk.green(`Product: ${subscription.productId} - ${subscription.name}`));
            console.log(chalk.green(`Period: ${subscription.subscriptionStartDate} to ${subscription.subscriptionEndDate}`));
            console.log(chalk.green(`Term: ${subscription.subscriptionTerm} months`));
            console.log(chalk.green('---------------------------'));
          });
          
          console.log(chalk.green(`Total Subscriptions: ${response.data.data.subscriptions.length}`));
        } else if (response.data && response.data.status === "SUCCESS") {
          console.log(chalk.yellow('\nNo subscriptions were found in the response.'));
        }
        
        // Show order info
        if (response.data && 
            response.data.data && 
            response.data.data.order) {
          const order = response.data.data.order;
          console.log(chalk.green('\nOrder Details:'));
          console.log(chalk.green(`Order Number: ${order.orderNumber}`));
          console.log(chalk.green(`Status: ${order.status}`));
        }
      }
    }
    
    return response;
  } catch (error) {
    console.error(chalk.red(`Error activating ${orderType}:`));
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
    throw error;
  }
}

module.exports = {
  activateOrder
};