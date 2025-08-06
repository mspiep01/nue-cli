const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const os = require('os');

class SetKeyCommand {
  constructor() {
    this.configDir = path.join(os.homedir(), '.nue');
    this.configFile = path.join(this.configDir, 'config.json');
  }

  register(program) {
    program
      .command('set-key')
      .description('Set Nue API key for authentication')
      .option('--key <apiKey>', 'API key to set')
      .option('--environment <env>', 'Environment (production, sandbox)', 'production')
      .option('--force', 'Overwrite existing key')
      .action(this.handleAction.bind(this));
  }

  async handleAction(options) {
    try {
      console.log(chalk.blue('Setting API key...'));

      // Get API key from options or prompt
      let apiKey = options.key;
      if (!apiKey) {
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        apiKey = await new Promise((resolve) => {
          rl.question('Enter your Nue API key: ', (answer) => {
            rl.close();
            resolve(answer.trim());
          });
        });
      }

      if (!apiKey) {
        throw new Error('API key is required');
      }

      // Validate API key format (basic validation)
      if (apiKey.length < 10) {
        throw new Error('API key appears to be invalid (too short)');
      }

      // Ensure config directory exists
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      // Load existing config
      let config = {};
      if (fs.existsSync(this.configFile)) {
        try {
          const configData = fs.readFileSync(this.configFile, 'utf8');
          config = JSON.parse(configData);
        } catch (error) {
          console.warn(chalk.yellow('Warning: Could not read existing config file'));
        }
      }

      // Check if key already exists
      if (config.apiKeys && config.apiKeys[options.environment] && !options.force) {
        console.error(chalk.red(`API key for ${options.environment} environment already exists. Use --force to overwrite.`));
        process.exit(1);
      }

      // Update config
      if (!config.apiKeys) {
        config.apiKeys = {};
      }
      config.apiKeys[options.environment] = apiKey;
      config.defaultEnvironment = options.environment;

      // Save config
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));

      console.log(chalk.green(`API key set successfully for ${options.environment} environment!`));
      console.log(chalk.blue(`Config saved to: ${this.configFile}`));

      // Show usage example
      console.log(chalk.blue('\nYou can now use the CLI with commands like:'));
      console.log(chalk.gray('nue lifecycle customers create --json \'{"name": "Acme Corp"}\''));
      console.log(chalk.gray('nue platform metadata export --object-type customers'));

    } catch (error) {
      console.error(chalk.red('Failed to set API key:'), error.message);
      process.exit(1);
    }
  }
}

module.exports = SetKeyCommand; 