const CommandDiscovery = require('./commandDiscovery');

/**
 * Command Registry with auto-registration
 */
class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.discovery = new CommandDiscovery();
    this.autoRegisterCommands();
  }

  /**
   * Auto-register all discovered commands
   */
  autoRegisterCommands() {
    const discoveredCommands = this.discovery.discoverCommands();
    
    for (const command of discoveredCommands) {
      this.registerCommand(command.name, command.module, command.metadata);
    }
  }

  /**
   * Register a command with the registry
   * @param {string} name - Command name
   * @param {Function} commandFunction - Command function
   * @param {Object} metadata - Command metadata
   */
  registerCommand(name, commandFunction, metadata = {}) {
    this.commands.set(name, {
      function: commandFunction,
      metadata: metadata
    });
  }

  /**
   * Get a command by name
   * @param {string} name - Command name
   * @returns {Object|null} Command data
   */
  getCommand(name) {
    return this.commands.get(name);
  }

  /**
   * Get all registered commands
   * @returns {Map} Map of command names to command data
   */
  getAllCommands() {
    return this.commands;
  }

  /**
   * Get commands by category
   * @param {string} category - Command category
   * @returns {Array} Array of commands in the category
   */
  getCommandsByCategory(category) {
    const commands = [];
    for (const [name, data] of this.commands) {
      if (data.metadata.category === category) {
        commands.push({ name, ...data });
      }
    }
    return commands;
  }

  /**
   * Check if a command exists
   * @param {string} name - Command name
   * @returns {boolean} Whether the command exists
   */
  hasCommand(name) {
    return this.commands.has(name);
  }

  /**
   * Remove a command from the registry
   * @param {string} name - Command name
   */
  removeCommand(name) {
    this.commands.delete(name);
  }

  /**
   * Clear all commands
   */
  clear() {
    this.commands.clear();
  }

  /**
   * Get command info for help/listing
   * @returns {Array} Array of command information
   */
  getCommandInfo() {
    const info = [];
    for (const [name, data] of this.commands) {
      info.push({
        name,
        description: data.metadata.description || 'No description available',
        category: data.metadata.category || 'general',
        aliases: data.metadata.aliases || [],
        examples: data.metadata.examples || []
      });
    }
    return info;
  }

  /**
   * Register commands with Commander.js program
   * @param {Object} program - Commander program instance
   */
  registerWithProgram(program) {
    for (const [name, data] of this.commands) {
      try {
        const commandFunction = data.function;
        
        // Handle different command types
        if (typeof commandFunction === 'function') {
          // Check if it's a class constructor
          if (commandFunction.prototype && commandFunction.prototype.constructor) {
            // It's a class, instantiate it and call register
            const commandInstance = new commandFunction();
            if (typeof commandInstance.register === 'function') {
              commandInstance.register(program);
            } else {
              console.warn(`Command ${name} is a class but doesn't have a register method`);
            }
          } else {
            // It's a regular function, call it directly
            commandFunction(program);
          }
        } else {
          console.warn(`Command ${name} has an invalid function type`);
        }
      } catch (error) {
        console.warn(`Failed to register command ${name}:`, error.message);
      }
    }
  }

  /**
   * Validate command structure
   * @param {string} name - Command name
   * @returns {Object} Validation result
   */
  validateCommand(name) {
    const commandData = this.commands.get(name);
    if (!commandData) {
      return { valid: false, error: `Command not found: ${name}` };
    }

    const { function: commandFunction, metadata } = commandData;
    const errors = [];

    // Check if command function exists
    if (!commandFunction || typeof commandFunction !== 'function') {
      errors.push('Command function is not valid');
    }

    // Check if metadata exists
    if (!metadata) {
      errors.push('Command metadata is missing');
    }

    return {
      valid: errors.length === 0,
      errors,
      metadata
    };
  }
}

module.exports = CommandRegistry; 