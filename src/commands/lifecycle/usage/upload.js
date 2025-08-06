const chalk = require('chalk');
const { PlatformCommandBuilder } = require('../../../services/platform-command');
const { LifecycleManager } = require('../../../services/lifecycle-manager');
const { ApiClientFactory } = require('../../../clients/api-client-factory');

class UploadUsageCommand {
  constructor() {
    this.builder = new PlatformCommandBuilder('lifecycle', 'usage', 'upload');
  }

  register(program) {
    this.builder
      .addLifecycleOptions()
      .addCommonOptions()
      .build(program)
      .action(this.handleAction.bind(this));
  }

  async handleAction(options) {
    try {
      console.log(chalk.blue('Uploading usage data...'));

      // Validate input
      if (!options.json && !options.file) {
        throw new Error('Must specify --json or --file option');
      }

      // Parse usage data
      const usageData = await this.parseUsageData(options);

      // Setup API client
      const apiClient = await this.setupApiClient(options);
      const lifecycleManager = new LifecycleManager(apiClient);

      if (options.verbose) {
        console.log(chalk.gray('Usage data:'));
        console.log(chalk.gray(JSON.stringify(usageData, null, 2)));
      }

      // Upload usage
      const result = await lifecycleManager.uploadUsage(usageData, {
        validateOnly: options.validateOnly || false
      });

      // Display results
      this.displayResults(result, options);

    } catch (error) {
      console.error(chalk.red('Usage upload failed:'), error.message);
      if (options.verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  }

  async parseUsageData(options) {
    if (options.json) {
      return JSON.parse(options.json);
    } else if (options.file) {
      const fs = require('fs');
      const fileContent = fs.readFileSync(options.file, 'utf8');
      return JSON.parse(fileContent);
    }
    throw new Error('Invalid data source');
  }

  async setupApiClient(options) {
    const { apiKey } = await this.builder.setupApi(options);
    return ApiClientFactory.createClient('lifecycle', 'rest', { apiKey });
  }

  displayResults(result, options) {
    if (options.verbose) {
      console.log(chalk.green('Usage uploaded successfully!'));
      console.log(chalk.green('Response data:'));
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green('Usage uploaded successfully!'));
      
      if (result.data && result.data.uploaded) {
        console.log(chalk.blue(`Uploaded ${result.data.uploaded} usage records`));
      }
      
      if (result.data && result.data.errors && result.data.errors.length > 0) {
        console.log(chalk.yellow(`Warnings: ${result.data.errors.length} issues found`));
      }
    }

    // Show file output if specified
    if (options.output) {
      console.log(chalk.blue(`Results saved to: ${options.output}`));
    }
  }
}

module.exports = UploadUsageCommand; 