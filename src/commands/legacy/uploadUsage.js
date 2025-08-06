const chalk = require('chalk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { UsageCommand } = require('../../services/builder');

/**
 * Uploads usage data to the Nue platform
 * @param {Object} program - Commander program instance
 */
module.exports = function(program) {
  const command = new UsageCommand();
  
  command.build(program, async (options) => {
    await command.executeWithErrorHandling(
      async () => {
        console.log(chalk.blue('Uploading usage data...'));
        
        const usagePayload = await getUsagePayload(options);
        validateUsagePayload(usagePayload);
        
        // API URL is the same for all environments, only the API key changes
        const apiBaseUrl = process.env.NUE_API_URL || 'https://api.nue.io';
        
        const { apiKey } = await command.setupApi(options);
        
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
      },
      options,
      'uploading usage data',
      'usage'
    );
  });
};

/**
 * Get usage payload from either --json or --file options
 * @param {Object} options - Command options
 * @returns {Object} - Parsed usage payload
 */
async function getUsagePayload(options) {
  if (options.json) {
    try {
      return JSON.parse(options.json);
    } catch (err) {
      throw new Error(`Error parsing JSON payload: ${err.message}`);
    }
  } else if (options.file) {
    try {
      const filePath = path.resolve(options.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    } catch (err) {
      throw new Error(`Error reading or parsing file: ${options.file} - ${err.message}`);
    }
  } else {
    throw new Error('You must provide either --json or --file option');
  }
}

/**
 * Validate usage payload structure
 * @param {Object} usagePayload - The payload to validate
 */
function validateUsagePayload(usagePayload) {
  if (!usagePayload.transactionId) {
    throw new Error('The usage payload must include a transactionId');
  }
  
  if (!usagePayload.data || !Array.isArray(usagePayload.data) || usagePayload.data.length === 0) {
    throw new Error('The usage payload must include a non-empty data array');
  }
}