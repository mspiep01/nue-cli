const chalk = require('chalk');
const axios = require('axios');
const { GetSubscriptionsCommand } = require('../../services/builder');

/**
 * Get subscriptions using the Nue REST API
 * @param {Object} program - Commander program instance
 */
module.exports = function(program) {
  const command = new GetSubscriptionsCommand();
  
  command.build(program, async (options) => {
    await command.executeWithErrorHandling(
      async () => {
        console.log(chalk.blue('Fetching subscriptions...'));
        
        // Validate mutual exclusivity
        if (options.name && options.customerIds) {
          throw new Error('You cannot use both --name and --customer-ids together');
        }
        
        // API URL is the same for all environments, only the API key changes
        const apiBaseUrl = process.env.NUE_API_URL || 'https://api.nue.io';
        
        const { apiKey } = await command.setupApi(options);
        
        // Build query parameters
        const queryParams = buildQueryParams(options);
        
        // Build request URL
        const url = `${apiBaseUrl}/subscriptions?${queryParams.toString()}`;
        
        if (options.verbose) {
          console.log(chalk.gray('Request URL:'));
          console.log(chalk.gray(url));
        }
        
        // Make API call
        const response = await axios.get(url, {
          headers: {
            'Accept': 'application/json',
            'nue-api-key': apiKey
          }
        });
        
        // Handle successful response
        if (options.verbose) {
          console.log(chalk.green('Subscriptions retrieved successfully!'));
          console.log(chalk.green(`Response status: ${response.status}`));
          console.log(chalk.green('Response data:'));
          console.log(JSON.stringify(response.data, null, 2));
        } else {
          displaySubscriptions(response.data);
        }
      },
      options,
      'fetching subscriptions',
      'subscriptions'
    );
  });
};

/**
 * Build query parameters for the API request
 * @param {Object} options - Command options
 * @returns {URLSearchParams} - Query parameters
 */
function buildQueryParams(options) {
  const queryParams = new URLSearchParams();
  
  if (options.name) {
    queryParams.append('name', options.name);
  }
  
  if (options.customerIds) {
    try {
      // Validate that customerIds is a valid JSON array
      const customerIds = JSON.parse(options.customerIds);
      if (!Array.isArray(customerIds)) {
        throw new Error('Customer IDs must be a JSON array');
      }
      queryParams.append('customerIds', options.customerIds);
    } catch (error) {
      throw new Error(`Error parsing customer IDs: ${error.message}. The --customer-ids option must be a valid JSON array string, e.g., '["cust-123", "cust-456"]'`);
    }
  }
  
  if (options.status) {
    queryParams.append('status', options.status);
  }
  
  // Handle includes
  const includes = [];
  if (options.includeProduct) {
    includes.push('product');
  }
  if (options.includePricetags) {
    includes.push('pricetags');
  }
  
  if (includes.length > 0) {
    queryParams.append('includes', includes.join(','));
  }
  
  return queryParams;
}

/**
 * Display subscriptions in a formatted way
 * @param {Object} responseData - API response data
 */
function displaySubscriptions(responseData) {
  // Check if the response has the expected structure
  if (!responseData || responseData.status !== 'SUCCESS' || !Array.isArray(responseData.data)) {
    throw new Error('Unexpected response format from API. Please run with --verbose to see the full response');
  }
  
  const subscriptions = responseData.data;
  console.log(chalk.green('Subscriptions retrieved successfully!'));
  
  if (!subscriptions || subscriptions.length === 0) {
    console.log(chalk.yellow('No subscriptions found matching your criteria.'));
    return;
  }
  
  console.log(chalk.green(`\nFound ${subscriptions.length} subscriptions:`));
  
  // Display subscription information
  subscriptions.forEach((subscription, index) => {
    console.log(chalk.green(`\nSubscription #${index + 1}:`));
    console.log(chalk.green('---------------------------'));
    
    // Basic subscription information
    console.log(chalk.cyan('ID:              ') + (subscription.id || 'N/A'));
    console.log(chalk.cyan('Name:            ') + (subscription.name || 'N/A'));
    console.log(chalk.cyan('Status:          ') + (subscription.status || 'N/A'));
    console.log(chalk.cyan('External ID:     ') + (subscription.externalId || 'N/A'));
    console.log(chalk.cyan('External Name:   ') + (subscription.externalName || 'N/A'));
    console.log(chalk.cyan('Customer ID:     ') + (subscription.customerId || 'N/A'));
    console.log(chalk.cyan('Subscription End:') + (subscription.subscriptionEndDate || 'N/A'));
    console.log(chalk.cyan('Billing Period:  ') + (subscription.billingPeriod || 'N/A'));
    
    // Product details if included
    if (subscription.product) {
      console.log(chalk.green('\nProduct Information:'));
      console.log(chalk.cyan('Product ID:      ') + (subscription.product.id || 'N/A'));
      console.log(chalk.cyan('Product Name:    ') + (subscription.product.name || 'N/A'));
      console.log(chalk.cyan('Product Type:    ') + (subscription.product.type || 'N/A'));
    }
    
    // Price tags if included
    if (subscription.pricetags && subscription.pricetags.length > 0) {
      console.log(chalk.green('\nPrice Tags:'));
      subscription.pricetags.forEach((pricetag, pIndex) => {
        console.log(chalk.cyan(`  Tag #${pIndex + 1}:`));
        console.log(chalk.cyan('  ID:           ') + (pricetag.id || 'N/A'));
        console.log(chalk.cyan('  Name:         ') + (pricetag.name || 'N/A'));
        console.log(chalk.cyan('  Type:         ') + (pricetag.type || 'N/A'));
        console.log(chalk.cyan('  List Price:   ') + (pricetag.listPrice || 'N/A'));
        if (pIndex < subscription.pricetags.length - 1) {
          console.log(); // Add line break between price tags
        }
      });
    }
    
    console.log(chalk.green('---------------------------'));
  });
}