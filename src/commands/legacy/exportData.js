const { Validator } = require('../../services');
const { Logger } = require('../../utils');
const { ExportCommand, DownloadCommand } = require('../../services/builder');
const { ExportStrategyFactory } = require('../../services/strategy');

class ExportCommandHandler {
  constructor() {
    this.exportCommand = new ExportCommand();
    this.downloadCommand = new DownloadCommand();
  }

  /**
   * Register the commands with Commander.js
   * @param {Object} program - Commander program instance
   */
  register(program) {
    this.exportCommand.build(program, this.handleExportAction.bind(this));
    this.downloadCommand.build(program, this.handleDownloadAction.bind(this));
  }

  /**
   * Handle the export command action
   * @param {string} objectType - The object type to export
   * @param {Object} options - Command options
   */
  async handleExportAction(objectType, options) {
    await this.exportCommand.executeWithErrorHandling(
      async () => {
        Validator.validateObjectType(objectType, options);

        Logger.info(`Creating export job for ${objectType}...`);

        const { apiClient } = await this.exportCommand.setupApi(options);

        options.objectType = objectType;

        const strategy = ExportStrategyFactory.createStrategy(options, apiClient);
        await strategy.execute(objectType);
      },
      options,
      'exporting',
      objectType
    );
  }

  /**
   * Handle the download command action
   * @param {string} jobId - The job ID to download from
   * @param {Object} options - Command options
   */
  async handleDownloadAction(jobId, options) {
    await this.downloadCommand.executeWithErrorHandling(
      async () => {
        Validator.validateJobId(jobId, options);

        const { apiClient } = await this.downloadCommand.setupApi(options);

        options.jobId = jobId;

        const strategy = ExportStrategyFactory.createStrategy(options, apiClient);
        await strategy.execute(jobId);
      },
      options,
      'downloading from job',
      jobId
    );
  }
}

module.exports = function(program) {
  const handler = new ExportCommandHandler();
  handler.register(program);
}; 