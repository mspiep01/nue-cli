const { ActivateChangeOrderCommand } = require('../../services/builder');
const { activateOrder } = require('../../utils');

/**
 * Activates an existing change order in the Nue platform
 * @param {Object} program - Commander program instance
 */
module.exports = function(program) {
  const command = new ActivateChangeOrderCommand();
  
  command.build(program, async (changeOrderId, options) => {
    await command.executeWithErrorHandling(
      async () => {
        // API URL is the same for all environments, only the API key changes
        const apiBaseUrl = process.env.NUE_API_URL || 'https://api.nue.io';
        
        const { apiKey } = await command.setupApi(options);
        
        // Use shared utility to activate change order
        await activateOrder(changeOrderId, options, apiBaseUrl, apiKey, 'change-order');
      },
      options,
      'activating change order',
      'change-order'
    );
  });
};