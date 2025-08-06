const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Handles setting API keys for the Nue CLI
 * @param {Object} program - Commander program instance
 */
module.exports = function(program) {
  program
    .command('set-key')
    .description('Set API key for Nue CLI')
    .option('--sandbox', 'Set sandbox environment API key', false)
    .option('--key <key>', 'API key value')
    .action(async (options) => {
      try {
        const envVarName = options.sandbox ? 'NUE_SANDBOX_API_KEY' : 'NUE_API_KEY';
        const envType = options.sandbox ? 'sandbox' : 'production';
        
        console.log(chalk.blue(`Setting ${envType} API key...`));
        
        // Find the .env file location (in the project root)
        const envFilePath = path.resolve(process.cwd(), '.env');
        let envFileExists = fs.existsSync(envFilePath);
        let currentEnvVars = {};

        // Read existing environment variables if file exists
        if (envFileExists) {
          const envFileContent = fs.readFileSync(envFilePath, 'utf8');
          
          // Parse existing env vars
          envFileContent.split('\n').forEach(line => {
            if (line && !line.startsWith('#')) {
              const [key, ...valueParts] = line.split('=');
              if (key && valueParts.length > 0) {
                currentEnvVars[key.trim()] = valueParts.join('=').trim();
              }
            }
          });
        }
        
        // Check if API key already exists
        let proceed = true;
        if (currentEnvVars[envVarName]) {
          // Mask the existing key for security (show first 4 and last 4 chars)
          const existingKey = currentEnvVars[envVarName];
          const maskedKey = existingKey.length > 8 
            ? `${existingKey.substring(0, 4)}...${existingKey.substring(existingKey.length - 4)}`
            : '********';
          
          console.log(chalk.yellow(`An existing ${envType} API key was found: ${maskedKey}`));
          
          // Ask for confirmation to replace
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          proceed = await new Promise(resolve => {
            rl.question(chalk.yellow('Do you want to replace it? (y/N): '), answer => {
              rl.close();
              resolve(answer.toLowerCase() === 'y');
            });
          });
          
          if (!proceed) {
            console.log(chalk.yellow('Operation cancelled.'));
            return;
          }
        }
        
        // Get the API key value
        let apiKey = options.key;
        if (!apiKey) {
          // If key wasn't provided as an option, prompt for it
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          apiKey = await new Promise(resolve => {
            rl.question(chalk.blue(`Enter your ${envType} API key: `), answer => {
              rl.close();
              resolve(answer.trim());
            });
          });
        }
        
        if (!apiKey) {
          console.error(chalk.red('Error: API key cannot be empty'));
          process.exit(1);
        }
        
        // Set the environment variable in the .env file
        currentEnvVars[envVarName] = apiKey;
        
        // Make sure NUE_API_URL is set if it doesn't exist
        if (!currentEnvVars['NUE_API_URL']) {
          currentEnvVars['NUE_API_URL'] = 'https://api.nue.io';
        }
        
        // Write to .env file
        const envFileContent = Object.entries(currentEnvVars)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        
        fs.writeFileSync(envFilePath, envFileContent, 'utf8');
        
        console.log(chalk.green(`${envType.charAt(0).toUpperCase() + envType.slice(1)} API key has been saved successfully!`));
      } catch (error) {
        console.error(chalk.red('Error setting API key:'));
        console.error(chalk.red(error.message));
        process.exit(1);
      }
    });
};