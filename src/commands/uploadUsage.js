const chalk = require('chalk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { checkAndPromptForApiKey } = require('../utils/apiKeyUtils');

/**
 * Uploads usage data to the Nue platform
 * @param {Object} program - Commander program instance
 */
module.exports = function(program) {
  program
    .command('upload-usage')
    .description('Upload usage data to the Nue platform')
    .option('--sandbox', 'Use sandbox environment', false)
    .option('--json <json>', 'JSON payload for the usage data')
    .option('--file <path>', 'Path to JSON file containing the usage data payload')
    .option('--verbose', 'Show detailed output information', false)
    .action(async (options) => {
      try {
        if (options.verbose) {
          console.log(chalk.blue('Uploading usage data...'));
        } else {
          console.log(chalk.blue('Uploading usage data...'));
        }
        
        let usagePayload;
        
        // Get payload from either --json or --file
        if (options.json) {
          try {
            usagePayload = JSON.parse(options.json);
          } catch (err) {
            console.error(chalk.red('Error parsing JSON payload:'));
            console.error(chalk.red(err.message));
            process.exit(1);
          }
        } else if (options.file) {
          try {
            const filePath = path.resolve(options.file);
            if (!fs.existsSync(filePath)) {
              console.error(chalk.red(`File not found: ${filePath}`));
              process.exit(1);
            }
            
            const fileContent = fs.readFileSync(filePath, 'utf8');
            usagePayload = JSON.parse(fileContent);
          } catch (err) {
            console.error(chalk.red(`Error reading or parsing file: ${options.file}`));
            console.error(chalk.red(err.message));
            process.exit(1);
          }
        } else {
          console.error(chalk.red('Error: You must provide either --json or --file option'));
          process.exit(1);
        }
        
        // Validate the payload has required fields
        if (!usagePayload.transactionId) {
          console.error(chalk.red('Error: The usage payload must include a transactionId'));
          process.exit(1);
        }
        
        if (!usagePayload.data || !Array.isArray(usagePayload.data) || usagePayload.data.length === 0) {
          console.error(chalk.red('Error: The usage payload must include a non-empty data array'));
          process.exit(1);
        }
        
        // API URL is the same for all environments, only the API key changes
        const apiBaseUrl = process.env.NUE_API_URL || 'https://api.nue.io';
        
        // Use the utility to check for the API key and prompt if not found
        const apiKey = await checkAndPromptForApiKey(options.sandbox);
        
        if (!apiKey) {
          console.error(chalk.red(`Unable to proceed without API key`));
          process.exit(1);
        }
        
        if (options.verbose) {
          console.log(chalk.gray('Usage payload:'));
          console.log(chalk.gray(JSON.stringify(usagePayload, null, 2)));
        }
        
        // Make API call to upload usage data
        const response = await axios.post(`${apiBaseUrl}/api/usage/raw-usage`, usagePayload, {
          headers: {
            'Content-Type': 'application/json',
            'nue-api-key': apiKey
          }
        });
        
        // Handle successful response
        if (options.verbose) {
          console.log(chalk.green('Usage data uploaded successfully!'));
          console.log(chalk.green(`Response status: ${response.status}`));
          if (response.data) {
            console.log(chalk.green('Response data:'));
            console.log(JSON.stringify(response.data, null, 2));
          }
        } else {
          // Non-verbose mode
          console.log(chalk.green('Usage data uploaded successfully!'));
          console.log(chalk.green(`Transaction ID: ${usagePayload.transactionId}`));
          console.log(chalk.green(`Records processed: ${usagePayload.data.length}`));
          
          // Show some response data if available
          if (response.data && response.data.status) {
            console.log(chalk.green(`Status: ${response.data.status}`));
          }
        }
      } catch (error) {
        console.error(chalk.red('Error uploading usage data:'));
        if (error.response) {
          if (options.verbose) {
            console.error(chalk.red(`Status: ${error.response.status}`));
            console.error(chalk.red(JSON.stringify(error.response.data, null, 2)));
          } else {
            console.error(chalk.red(`Status: ${error.response.status}`));
            if (error.response.data && error.response.data.error) {
              console.error(chalk.red(error.response.data.error));
            } else if (error.response.data && error.response.data.message) {
              console.error(chalk.red(error.response.data.message));
            }
          }
        } else {
          console.error(chalk.red(error.message));
        }
        process.exit(1);
      }
    });
};