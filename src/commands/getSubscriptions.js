const chalk = require('chalk');
const axios = require('axios');
const { checkAndPromptForApiKey } = require('../utils/apiKeyUtils');

/**
 * Get subscriptions using the Nue REST API
 * @param {Object} program - Commander program instance
 */
module.exports = function(program) {
  program
    .command('get-subscriptions')
    .description('Query subscriptions via the REST API')
    .option('--sandbox', 'Use sandbox environment', false)
    .option('--name <n>', 'Filter by subscription name')
    .option('--customer-ids <ids>', 'Filter by customer IDs (JSON array string)')
    .option('--status <status>', 'Filter by subscription status')
    .option('--include-product', 'Include product details', false)
    .option('--include-pricetags', 'Include price tags', false)
    .option('--verbose', 'Show detailed output information', false)
    .action(async (options) => {
      try {
        if (options.verbose) {
          console.log(chalk.blue('Querying subscriptions...'));
        } else {
          console.log(chalk.blue('Fetching subscriptions...'));
        }
        
        // Validate mutual exclusivity
        if (options.name && options.customerIds) {
          console.error(chalk.red('Error: You cannot use both --name and --customer-ids together'));
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
        
        // Build query parameters
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
            console.error(chalk.red(`Error parsing customer IDs: ${error.message}`));
            console.error(chalk.red('The --customer-ids option must be a valid JSON array string, e.g., \'["cust-123", "cust-456"]\''));
            process.exit(1);
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
          // Fix: Extract subscriptions from the correct response structure
          const responseData = response.data;
          
          // Check if the response has the expected structure
          if (!responseData || responseData.status !== 'SUCCESS' || !Array.isArray(responseData.data)) {
            console.error(chalk.red('Error: Unexpected response format from API'));
            console.error(chalk.red('Please run with --verbose to see the full response'));
            process.exit(1);
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
        
      } catch (error) {
        console.error(chalk.red('Error fetching subscriptions:'));
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
            } else {
              console.error(chalk.red('An unknown error occurred'));
            }
          }
        } else {
          console.error(chalk.red(error.message));
        }
        process.exit(1);
      }
    });
};