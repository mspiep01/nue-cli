const { CommandRegistry, StrategyRegistry } = require('./services/registry');
const { generateAllCommands } = require('./services/builder/configurableCommandBuilder');
const { Logger } = require('./utils');
const fs = require('fs');
const path = require('path');

/**
 * Enhanced CLI Manager that orchestrates auto-discovery and configuration-driven commands
 */
class CLIManager {
  constructor() {
    this.commandRegistry = new CommandRegistry();
    this.strategyRegistry = new StrategyRegistry();
    this.configurableCommands = new Map();
    this.program = null;
    this.logger = Logger;
  }

  /**
   * Initialize the CLI manager
   * @param {Object} program - Commander program instance
   */
  initialize(program) {
    this.program = program;
    
    // Discover and register commands
    this.discoverCommands();
    
    // Generate configurable commands
    this.generateConfigurableCommands();
    
    // Register all commands with the program
    this.registerCommands();
    
    // Set up help and error handling
    this.setupHelpAndErrors();
  }

  /**
   * Discover and register commands automatically
   */
  discoverCommands() {
    // Commands are auto-discovered by the registry silently
    this.commandRegistry.getAllCommands();
  }

  /**
   * Generate configurable commands from configuration
   */
  generateConfigurableCommands() {
    try {
      this.configurableCommands = generateAllCommands();
    } catch (error) {
      this.logger.warn('Failed to generate some configurable commands:', error.message);
    }
  }

  /**
   * Register all commands with the Commander program
   */
  registerCommands() {
    // Register discovered commands
    this.commandRegistry.registerWithProgram(this.program);
    
    // Register configurable commands
    this.registerConfigurableCommands();
    
    // Register strategy commands
    this.registerStrategyCommands();
  }

  /**
   * Register configurable commands with the program
   */
  registerConfigurableCommands() {
    for (const [commandName, commandBuilder] of this.configurableCommands) {
      try {
        // Check if command already exists (from discovery)
        if (this.commandRegistry.hasCommand(commandName)) {
          this.logger.debug(`Skipping configurable command ${commandName} - already registered via discovery`);
          continue;
        }

        // Check if command already exists in program
        if (this.program.commands.some(cmd => cmd.name() === commandName)) {
          this.logger.debug(`Skipping configurable command ${commandName} - already registered in program`);
          continue;
        }

        // Build and register the command
        commandBuilder.build(this.program, this.createCommandHandler(commandName));
        this.logger.debug(`Registered configurable command: ${commandName}`);
      } catch (error) {
        this.logger.warning(`Failed to register configurable command ${commandName}:`, error.message);
      }
    }
  }

  /**
   * Register strategy-based commands
   */
  registerStrategyCommands() {
    const strategies = this.strategyRegistry.getAllStrategies();
    
    for (const [strategyName, strategyData] of strategies) {
      try {
        // Create strategy command if it has command metadata
        if (strategyData.metadata.command) {
          this.createStrategyCommand(strategyName, strategyData);
        }
      } catch (error) {
        this.logger.warning(`Failed to create strategy command for ${strategyName}:`, error.message);
      }
    }
  }

  /**
   * Create a command handler for configurable commands
   * @param {string} commandName - The command name
   * @returns {Function} Command handler function
   */
  createCommandHandler(commandName) {
    return async (options) => {
      try {
        this.logger.info(`Executing configurable command: ${commandName}`);
        
        // Get the command configuration
        const commandConfig = this.configurableCommands.get(commandName).config;
        
        // Validate options against configuration
        const validation = this.validateCommandOptions(commandName, options);
        if (!validation.valid) {
          throw new Error(`Invalid options: ${validation.errors.join(', ')}`);
        }
        
        // Execute the command using appropriate strategy
        await this.executeCommand(commandName, options, commandConfig);
        
      } catch (error) {
        this.logger.error(`Error executing command ${commandName}:`, error.message);
        process.exit(1);
      }
    };
  }

  /**
   * Execute a command using the appropriate strategy
   * @param {string} commandName - The command name
   * @param {Object} options - Command options
   * @param {Object} config - Command configuration
   */
  async executeCommand(commandName, options, config) {
    // Determine the appropriate strategy based on command category
    const strategyType = this.determineStrategyType(commandName, config);
    
    if (this.strategyRegistry.hasStrategy(strategyType)) {
      // Use registered strategy
      const strategy = this.strategyRegistry.createStrategy(strategyType, options);
      await strategy.execute(options);
    } else {
      // Fallback to default execution
      this.logger.warning(`No strategy found for ${commandName}, using default execution`);
      await this.defaultCommandExecution(commandName, options);
    }
  }

  /**
   * Determine the strategy type for a command
   * @param {string} commandName - The command name
   * @param {Object} config - Command configuration
   * @returns {string} Strategy type
   */
  determineStrategyType(commandName, config) {
    // Map command categories to strategy types
    const categoryToStrategy = {
      'orders': 'order',
      'data': 'data',
      'subscriptions': 'subscription',
      'usage': 'usage',
      'config': 'config'
    };
    
    return categoryToStrategy[config.category] || 'default';
  }

  /**
   * Default command execution when no strategy is available
   * @param {string} commandName - The command name
   * @param {Object} options - Command options
   */
  async defaultCommandExecution(commandName, options) {
    this.logger.info(`Executing ${commandName} with default handler`);
    // This would typically delegate to the original command implementation
    // For now, just log the execution
    this.logger.info(`Command ${commandName} executed with options:`, options);
  }

  /**
   * Validate command options against configuration
   * @param {string} commandName - The command name
   * @param {Object} options - Command options
   * @returns {Object} Validation result
   */
  validateCommandOptions(commandName, options) {
    const commandBuilder = this.configurableCommands.get(commandName);
    if (!commandBuilder) {
      return { valid: false, errors: ['Command not found'] };
    }

    const validation = commandBuilder.validate();
    if (!validation.valid) {
      return validation;
    }

    // Additional option validation could be added here
    return { valid: true, errors: [], warnings: validation.warnings };
  }

  /**
   * Create a strategy command
   * @param {string} strategyName - The strategy name
   * @param {Object} strategyData - The strategy data
   */
  createStrategyCommand(strategyName, strategyData) {
    const { command: commandConfig } = strategyData.metadata;
    
    if (!commandConfig) {
      return;
    }

    const command = this.program
      .command(commandConfig.name || strategyName)
      .description(commandConfig.description || `${strategyName} strategy command`);

    // Add options from strategy metadata
    if (commandConfig.options) {
      for (const [optionName, optionDef] of Object.entries(commandConfig.options)) {
        command.option(optionDef.flag, optionDef.description, optionDef.defaultValue);
      }
    }

    // Add action
    command.action(async (options) => {
      try {
        const strategy = this.strategyRegistry.createStrategy(strategyName, options);
        await strategy.execute(options);
      } catch (error) {
        this.logger.error(`Error executing strategy ${strategyName}:`, error.message);
        process.exit(1);
      }
    });
  }

  /**
   * Set up help and error handling
   */
  setupHelpAndErrors() {
    // Handle unknown commands
    this.program.on('command:*', (operands) => {
      this.logger.error(`Unknown command '${operands[0]}'`);
      this.logger.info('Run --help for available commands');
      process.exit(1);
    });

    // Show help if no arguments provided
    if (!process.argv.slice(2).length) {
      this.program.help();
    }
  }

  /**
   * Get command information for help
   * @returns {Object} Command information organized by category
   */
  getCommandInfo() {
    const info = {
      discovered: this.commandRegistry.getCommandInfo(),
      configurable: [],
      strategies: this.strategyRegistry.getStrategyInfo()
    };

    // Add configurable commands info
    for (const [name, builder] of this.configurableCommands) {
      info.configurable.push({
        name,
        description: builder.config.description,
        category: builder.getCategory(),
        examples: builder.getExamples()
      });
    }

    return info;
  }

  /**
   * Get registry information
   * @returns {Object} Registry information
   */
  getRegistryInfo() {
    return {
      commands: {
        total: this.commandRegistry.getAllCommands().size,
        byCategory: this.getCommandsByCategory()
      },
      strategies: {
        total: this.strategyRegistry.getAllStrategies().size,
        byType: this.getStrategiesByType()
      },
      configurable: {
        total: this.configurableCommands.size
      }
    };
  }

  /**
   * Get commands organized by category
   * @returns {Object} Commands by category
   */
  getCommandsByCategory() {
    const categories = {};
    const commands = this.commandRegistry.getCommandInfo();
    
    for (const command of commands) {
      const category = command.category || 'general';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(command);
    }
    
    return categories;
  }

  /**
   * Get strategies organized by type
   * @returns {Object} Strategies by type
   */
  getStrategiesByType() {
    const types = {};
    const strategies = this.strategyRegistry.getStrategyInfo();
    
    for (const strategy of strategies) {
      const type = strategy.type || 'unknown';
      if (!types[type]) {
        types[type] = [];
      }
      types[type].push(strategy);
    }
    
    return types;
  }
}

module.exports = CLIManager; 