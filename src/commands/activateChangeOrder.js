const chalk = require('chalk');
const { checkAndPromptForApiKey } = require('../utils/apiKeyUtils');
const { activateOrder } = require('../utils/orderUtils');

/**
 * Activates an existing change order in the Nue platform
 * @param {Object} program - Commander program instance
 */
module.exports = function(program) {
  program
    .command('activate-change-order <changeOrderId>')
    .description('Activate an existing change order in the Nue platform')
    .option('--sandbox', 'Use sandbox environment', false)
    .option('--generate-invoice', 'Generate invoice during activation', false)
    .option('--activate-invoice', 'Activate invoice during activation', false)
    .option('--verbose', 'Show detailed output information', false)
    .action(async (changeOrderId, options) => {
      try {
        // API URL is the same for all environments, only the API key changes
        const apiBaseUrl = process.env.NUE_API_URL || 'https://api.nue.io';
        
        // Use the utility to check for the API key and prompt if not found
        const apiKey = await checkAndPromptForApiKey(options.sandbox);
        
        if (!apiKey) {
          console.error(chalk.red(`Unable to proceed without API key`));
          process.exit(1);
        }
        
        // Use shared utility to activate change order
        await activateOrder(changeOrderId, options, apiBaseUrl, apiKey, 'change-order');
      } catch (error) {
        console.error(chalk.red('Error activating change order:'));
        if (error.response) {
          // Error handling is already done in the utility
        } else {
          console.error(chalk.red(error.message));
        }
        process.exit(1);
      }
    });
};