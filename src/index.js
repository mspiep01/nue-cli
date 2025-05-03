#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
require('dotenv').config();

// Import commands
const createOrder = require('./commands/createOrder');
const activateOrder = require('./commands/activateOrder');
const createChangeOrder = require('./commands/createChangeOrder');
const activateChangeOrder = require('./commands/activateChangeOrder');
const setApiKey = require('./commands/setApiKey');
const queryObjects = require('./commands/queryObjects');
const uploadUsage = require('./commands/uploadUsage');
const getSubscriptions = require('./commands/getSubscriptions');

// Set up CLI information
program
  .name('nue')
  .description('CLI tool for interacting with Nue Self-Service API')
  .version('1.0.0');

// Register commands
createOrder(program);
activateOrder(program);
createChangeOrder(program);
activateChangeOrder(program);
setApiKey(program);
queryObjects(program);
uploadUsage(program);
getSubscriptions(program);

// Handle unknown commands
program.on('command:*', (operands) => {
  console.error(chalk.red(`Error: Unknown command '${operands[0]}'`));
  console.log('');
  program.help();
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.help();
}