const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Checks for the required API key and prompts the user to set one if not found
 * @param {boolean} sandbox - Whether to check for sandbox API key
 * @returns {Promise<string>} - The API key
 */
async function checkAndPromptForApiKey(sandbox = false) {
  const envVarName = sandbox ? 'NUE_SANDBOX_API_KEY' : 'NUE_API_KEY';
  const envType = sandbox ? 'sandbox' : 'production';
  let apiKey = process.env[envVarName];
  
  if (apiKey) {
    return apiKey; // Key already exists
  }
  
  console.log(chalk.yellow(`No ${envType} API key found in your environment.`));
  console.log(chalk.yellow(`Let's set up your ${envType} API key now.`));
  
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
  
  // Prompt for API key
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
  
  if (!apiKey) {
    console.error(chalk.red('Error: API key cannot be empty'));
    console.log(chalk.red('Operation cancelled. Please try again with a valid API key.'));
    return null;
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
  
  try {
    fs.writeFileSync(envFilePath, envFileContent, 'utf8');
    console.log(chalk.green(`\n${envType.charAt(0).toUpperCase() + envType.slice(1)} API key has been saved successfully!`));
    
    // Update process.env so the current command can use the new key
    process.env[envVarName] = apiKey;
    
    return apiKey;
  } catch (error) {
    console.error(chalk.red('Error saving API key:'));
    console.error(chalk.red(error.message));
    return null;
  }
}

module.exports = {
  checkAndPromptForApiKey
};