#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Set up CLI information
program
  .name('nue')
  .description('CLI tool for interacting with Nue Self-Service API')
  .version('0.0.1');

// Register lifecycle commands
function registerLifecycleCommands() {
  const lifecycleDir = path.join(__dirname, 'commands', 'lifecycle');
  if (!fs.existsSync(lifecycleDir)) return;

  // Orders commands
  const ordersDir = path.join(lifecycleDir, 'orders');
  if (fs.existsSync(ordersDir)) {
    try {
      const ordersCommands = require('./commands/lifecycle/orders');
      const ordersGroup = program.command('order')
        .description('Order management operations');
      
      Object.entries(ordersCommands).forEach(([action, CommandClass]) => {
        const command = new CommandClass();
        command.register(ordersGroup);
      });
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not load order commands:', error.message));
    }
  }

  // Subscriptions commands
  const subscriptionsDir = path.join(lifecycleDir, 'subscriptions');
  if (fs.existsSync(subscriptionsDir)) {
    try {
      const subscriptionsCommands = require('./commands/lifecycle/subscriptions');
      const subscriptionsGroup = program.command('subscription')
        .description('Subscription management operations');
      
      Object.entries(subscriptionsCommands).forEach(([action, CommandClass]) => {
        const command = new CommandClass();
        command.register(subscriptionsGroup);
      });
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not load subscription commands:', error.message));
    }
  }

  // Customers commands
  const customersDir = path.join(lifecycleDir, 'customers');
  if (fs.existsSync(customersDir)) {
    try {
      const customersCommands = require('./commands/lifecycle/customers');
      const customersGroup = program.command('customer')
        .description('Customer management operations');
      
      Object.entries(customersCommands).forEach(([action, CommandClass]) => {
        const command = new CommandClass();
        command.register(customersGroup);
      });
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not load customer commands:', error.message));
    }
  }

  // Usage commands
  const usageDir = path.join(lifecycleDir, 'usage');
  if (fs.existsSync(usageDir)) {
    try {
      const usageCommands = require('./commands/lifecycle/usage');
      const usageGroup = program.command('usage')
        .description('Usage management operations');
      
      Object.entries(usageCommands).forEach(([action, CommandClass]) => {
        const command = new CommandClass();
        command.register(usageGroup);
      });
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not load usage commands:', error.message));
    }
  }
}

// Register platform commands
function registerPlatformCommands() {
  const platformDir = path.join(__dirname, 'commands', 'platform');
  if (!fs.existsSync(platformDir)) return;

  const platformGroup = program.command('platform')
    .description('Platform operations (metadata, objects, settings)');

  // Metadata commands
  try {
    const metadataCommands = require('./commands/platform/metadata');
    Object.entries(metadataCommands).forEach(([action, CommandClass]) => {
      const command = new CommandClass();
      command.register(platformGroup);
    });
  } catch (error) {
    console.warn(chalk.yellow('Warning: Could not load platform metadata commands:', error.message));
  }
}

// Register legacy commands
function registerLegacyCommands() {
  // Legacy commands are now handled by the hierarchical command system
  // Individual legacy commands are deprecated in favor of the new structure
  return;
}

// Register config commands
function registerConfigCommands() {
  const configDir = path.join(__dirname, 'commands', 'config');
  if (!fs.existsSync(configDir)) return;

  try {
    const setKeyCommand = require('./commands/config/set-key');
    const command = new setKeyCommand();
    command.register(program);
  } catch (error) {
    console.warn(chalk.yellow('Warning: Could not load config set-key command:', error.message));
  }
}

// Register query command
function registerQueryCommand() {
  try {
    const QueryCommandHandler = require('./commands/query');
    const command = new QueryCommandHandler();
    command.register(program);
  } catch (error) {
    console.warn(chalk.yellow('Warning: Could not load query command:', error.message));
  }
}

// Set up help and error handling
function setupHelpAndErrors() {
  // Handle unknown commands
  program.on('command:*', (operands) => {
    console.error(chalk.red(`Unknown command '${operands[0]}'`));
    console.log(chalk.blue('Run --help for available commands'));
    process.exit(1);
  });

  // Show help if no arguments provided
  if (!process.argv.slice(2).length) {
    program.help();
  }
}

// Initialize CLI
function initialize() {
  try {
    registerLifecycleCommands();
    registerPlatformCommands();
    registerLegacyCommands();
    registerConfigCommands();
    registerQueryCommand();
    setupHelpAndErrors();
    
    // Parse arguments
    program.parse(process.argv);
  } catch (error) {
    console.error(chalk.red('Failed to initialize CLI:'), error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

// Run  CLI
initialize(); 