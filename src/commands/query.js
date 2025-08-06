const chalk = require('chalk');
const { QueryCommand } = require('../services/builder');
const { QueryStrategyFactory } = require('../services/strategy');

class QueryCommandHandler {
  constructor() {
    this.command = new QueryCommand();
  }

  register(program) {
    this.command.build(program, this.handleAction.bind(this));
  }

  async handleAction(objectType, options) {
    try {
      console.log(chalk.blue(`Querying ${objectType}...`));

      // Setup API client
      const { apiClient } = await this.command.setupApi(options);

      // Create and execute query strategy
      const strategy = QueryStrategyFactory.createStrategy(options, apiClient);
      await strategy.execute(objectType);

    } catch (error) {
      console.error(chalk.red('Query failed:'), error.message);
      if (options.verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  }
}

module.exports = QueryCommandHandler; 