const { BaseCommand } = require('./commandBuilder');
const { getCommandConfig, getOptionConfig } = require('../../config/commandConfigs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Configurable command builder that generates commands from configuration
 */
class ConfigurableCommandBuilder extends BaseCommand {
  constructor(commandName, config = null) {
    // Get configuration if not provided
    if (!config) {
      config = getCommandConfig(commandName);
    }

    if (!config) {
      throw new Error(`No configuration found for command: ${commandName}`);
    }

    // Call super constructor first with command name and description
    super(commandName, config.description);
    
    this.commandName = commandName;
    this.config = config;
    
    // Apply configuration
    this.applyConfig(config);
  }

  /**
   * Build command signature from configuration
   * @param {string} commandName - The command name
   * @param {Object} config - The command configuration
   * @returns {string} Command signature
   */
  buildSignature(commandName, config) {
    let signature = commandName;
    
    if (config.arguments && config.arguments.length > 0) {
      for (const arg of config.arguments) {
        signature += ` <${arg}>`;
      }
    }
    
    return signature;
  }

  /**
   * Apply configuration to the command
   * @param {Object} config - The command configuration
   */
  applyConfig(config) {
    // Add arguments from config
    if (config.arguments) {
      for (const arg of config.arguments) {
        this.argument(arg, `${arg} argument`);
      }
    }

    // Add options from config
    if (config.options) {
      for (const [optionType, enabled] of Object.entries(config.options)) {
        if (enabled) {
          this.addOptionType(optionType);
        }
      }
    }
  }

  /**
   * Add options of a specific type
   * @param {string} optionType - The option type
   * @returns {ConfigurableCommandBuilder} For method chaining
   */
  addOptionType(optionType) {
    const optionConfig = getOptionConfig(optionType);
    
    if (!optionConfig) {
      console.warn(`Unknown option type: ${optionType}`);
      return this;
    }

    // Add each option in the type
    for (const [optionName, optionDef] of Object.entries(optionConfig)) {
      this.option(
        optionDef.flag,
        optionDef.description,
        optionDef.defaultValue,
        optionDef.parser
      );
    }

    return this;
  }

  /**
   * Add custom options
   * @param {Array} options - Array of option definitions
   * @returns {ConfigurableCommandBuilder} For method chaining
   */
  addCustomOptions(options) {
    for (const option of options) {
      this.option(
        option.flag,
        option.description,
        option.defaultValue,
        option.parser
      );
    }
    return this;
  }

  /**
   * Get command examples from configuration
   * @returns {Array} Array of example commands
   */
  getExamples() {
    return this.config.examples || [];
  }

  /**
   * Get command category from configuration
   * @returns {string} Command category
   */
  getCategory() {
    return this.config.category || 'general';
  }

  /**
   * Validate the command configuration
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!this.config.description) {
      errors.push('Missing description');
    }

    if (!this.config.category) {
      warnings.push('Missing category (will default to "general")');
    }

    // Validate options
    if (this.config.options) {
      for (const optionType of Object.keys(this.config.options)) {
        const optionConfig = getOptionConfig(optionType);
        if (!optionConfig) {
          warnings.push(`Unknown option type: ${optionType}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Factory function to create configurable commands
 * @param {string} commandName - The command name
 * @param {Object} customConfig - Optional custom configuration
 * @returns {ConfigurableCommandBuilder} Configured command builder
 */
function createConfigurableCommand(commandName, customConfig = null) {
  return new ConfigurableCommandBuilder(commandName, customConfig);
}

/**
 * Generate all commands from configuration with caching
 * @returns {Map} Map of command names to command builders
 */
function generateAllCommands() {
  // Check if we can use cached results
  const cachedCommands = loadCachedConfigurableCommands();
  if (cachedCommands) {
    return cachedCommands;
  }

  // Generate fresh commands
  return performConfigurableCommandGeneration();
}

/**
 * Perform actual configurable command generation
 * @returns {Map} Map of command names to command builders
 */
function performConfigurableCommandGeneration() {
  const { getAllCommandConfigs } = require('../../config/commandConfigs');
  const configs = getAllCommandConfigs();
  const commands = new Map();

  for (const [commandName, config] of Object.entries(configs)) {
    try {
      const commandBuilder = new ConfigurableCommandBuilder(commandName, config);
      commands.set(commandName, commandBuilder);
    } catch (error) {
      console.warn(`Failed to generate command ${commandName}:`, error.message);
    }
  }

  // Cache the results
  cacheConfigurableCommands(commands);

  return commands;
}

/**
 * Load cached configurable commands if available and valid
 * @returns {Map|null} Cached commands or null if cache is invalid
 */
function loadCachedConfigurableCommands() {
  try {
    const cacheFile = path.join(__dirname, '../../../.nue-configurable-cache.json');
    if (!fs.existsSync(cacheFile)) {
      return null;
    }

    const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const currentHash = generateConfigHash();

    // Check if cache is still valid
    if (cacheData.hash !== currentHash) {
      return null;
    }

    // Check if cache is not too old (24 hours)
    const cacheAge = Date.now() - cacheData.timestamp;
    if (cacheAge > 24 * 60 * 60 * 1000) {
      return null;
    }

    // Reconstruct command builders from cache
    const commands = new Map();
    for (const [name, config] of Object.entries(cacheData.commands)) {
      try {
        const commandBuilder = new ConfigurableCommandBuilder(name, config);
        commands.set(name, commandBuilder);
      } catch (error) {
        console.warn(`Failed to reconstruct cached command ${name}:`, error.message);
      }
    }

    return commands;
  } catch (error) {
    return null;
  }
}

/**
 * Cache configurable commands
 * @param {Map} commands - Commands to cache
 */
function cacheConfigurableCommands(commands) {
  try {
    const cacheFile = path.join(__dirname, '../../../.nue-configurable-cache.json');
    const cacheData = {
      hash: generateConfigHash(),
      timestamp: Date.now(),
      commands: {}
    };

    // Store command configurations (not the builders themselves)
    for (const [name, builder] of commands) {
      cacheData.commands[name] = builder.config;
    }

    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
  } catch (error) {
    // Silently fail if caching fails
    console.debug('Failed to cache configurable commands:', error.message);
  }
}

/**
 * Generate a hash of the command configuration to detect changes
 * @returns {string} Hash of the configuration
 */
function generateConfigHash() {
  try {
    const { getAllCommandConfigs } = require('../../config/commandConfigs');
    const configs = getAllCommandConfigs();
    
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(configs));
    
    return hash.digest('hex');
  } catch (error) {
    return '';
  }
}

module.exports = {
  ConfigurableCommandBuilder,
  createConfigurableCommand,
  generateAllCommands
}; 