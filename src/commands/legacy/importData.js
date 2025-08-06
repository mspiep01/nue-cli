const { Validator } = require('../../services');
const { Logger } = require('../../utils');
const { ImportCommand } = require('../../services/builder');
const { ImportStrategyFactory } = require('../../services/strategy');


class ImportCommandHandler {
  constructor() {
    this.command = new ImportCommand();
  }

  /**
   * Register the command with Commander.js
   * @param {Object} program - Commander program instance
   */
  register(program) {
    this.command.build(program, this.handleAction.bind(this));
  }

  /**
   * Handle the import command action
   * @param {string} objectType - The object type to import
   * @param {string} file - The file path (optional for export job ID imports)
   * @param {Object} options - Command options
   */
  async handleAction(objectType, file, options) {
    await this.command.executeWithErrorHandling(
      async () => {
        Validator.validateObjectType(objectType, options);

        const { apiClient } = await this.command.setupApi(options);

        if (!options.exportJobId) {
          Validator.validateFileExists(file, options);
          Validator.validateFileFormat(file, options.format, options);
          Logger.info(`Importing ${objectType} data from ${file}...`, options);
        }

        const strategy = ImportStrategyFactory.createStrategy(objectType, options, apiClient);
        
        if (options.exportJobId) {
          await strategy.execute(objectType, options.exportJobId);
        } else {
          await strategy.execute(objectType, file);
        }
      },
      options,
      'importing',
      objectType
    );
  }
}

module.exports = function(program) {
  const handler = new ImportCommandHandler();
  handler.register(program);
}; 