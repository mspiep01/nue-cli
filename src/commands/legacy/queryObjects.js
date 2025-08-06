const { Validator } = require('../../services');
const { Logger } = require('../../utils');
const { QueryCommand } = require('../../services/builder');
const { QueryStrategyFactory } = require('../../services/strategy');

/**
 * Query command implementation using object-oriented approach
 */
class QueryCommandHandler {
  constructor() {
    this.command = new QueryCommand();
  }

  /**
   * Register the command with Commander.js
   * @param {Object} program - Commander program instance
   */
  register(program) {
    this.command.build(program, this.handleAction.bind(this));
  }

  /**
   * Handle the query command action
   * @param {string} objectType - The object type to query
   * @param {Object} options - Command options
   */
  async handleAction(objectType, options) {
    await this.command.executeWithErrorHandling(
      async () => {
        const { apiClient } = await this.command.setupApi(options);

        const strategy = QueryStrategyFactory.createStrategy(options, apiClient);
        await strategy.execute(objectType);
      },
      options,
      'querying',
      objectType
    );
  }
}

module.exports = function(program) {
  const handler = new QueryCommandHandler();
  handler.register(program);
}; 