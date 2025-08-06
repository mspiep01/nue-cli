const { ActivateOrderCommand } = require('../../services/builder');
const { activateOrder } = require('../../utils');

/**
 * Activates an existing order in the Nue platform
 * @param {Object} program - Commander program instance
 */
module.exports = function(program) {
  const command = new ActivateOrderCommand();
  
  command.build(program, async (orderId, options) => {
    await command.executeWithErrorHandling(
      async () => {
        // API URL is the same for all environments, only the API key changes
        const apiBaseUrl = process.env.NUE_API_URL || 'https://api.nue.io';
        
        const { apiKey } = await command.setupApi(options);
        
        // Use shared utility to activate order
        await activateOrder(orderId, options, apiBaseUrl, apiKey, 'order');
      },
      options,
      'activating order',
      'order'
    );
  });
};