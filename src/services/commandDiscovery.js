const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Auto-discovery system for commands with caching
 */
class CommandDiscovery {
  constructor(commandsDir = path.join(__dirname, '../commands')) {
    this.commandsDir = commandsDir;
    this.discoveredCommands = new Map();
    this.cacheFile = path.join(__dirname, '../../../.nue-cache.json');
    this.lastDiscovery = null;
  }

  /**
   * Discover all commands in the commands directory with caching
   * @returns {Array} Array of command metadata
   */
  discoverCommands() {
    // Check if we can use cached results
    const cachedCommands = this.loadCachedCommands();
    if (cachedCommands) {
      this.discoveredCommands = new Map(cachedCommands);
      return Array.from(this.discoveredCommands.values()).map(cmd => ({
        name: cmd.metadata.name,
        path: cmd.metadata.path,
        module: cmd.module,
        metadata: cmd.metadata
      }));
    }

    // Perform fresh discovery
    return this.performDiscovery();
  }

  /**
   * Perform actual command discovery
   * @returns {Array} Array of command metadata
   */
  performDiscovery() {
    const commands = [];
    
    if (!fs.existsSync(this.commandsDir)) {
      console.warn(`Commands directory not found: ${this.commandsDir}`);
      return commands;
    }

    // Discover commands recursively
    this.discoverCommandsRecursive(this.commandsDir, '', commands);

    // Cache the results
    this.cacheCommands();
    
    return commands;
  }

  /**
   * Discover commands recursively in directories
   * @param {string} dir - Directory to search
   * @param {string} prefix - Command name prefix
   * @param {Array} commands - Array to collect commands
   */
  discoverCommandsRecursive(dir, prefix, commands) {
    if (!fs.existsSync(dir)) {
      return;
    }

    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        // Recursively search subdirectories
        const subPrefix = prefix ? `${prefix}-${item}` : item;
        this.discoverCommandsRecursive(itemPath, subPrefix, commands);
      } else if (item.endsWith('.js') && item !== 'index.js') {
        // Found a command file
        const commandName = path.basename(item, '.js');
        const fullCommandName = prefix ? `${prefix}-${commandName}` : commandName;
        
        try {
          const commandModule = require(itemPath);
          const metadata = this.extractCommandMetadata(commandModule, fullCommandName);
          
          commands.push({
            name: fullCommandName,
            path: itemPath,
            module: commandModule,
            metadata
          });
          
          this.discoveredCommands.set(fullCommandName, {
            module: commandModule,
            metadata
          });
        } catch (error) {
          console.warn(`Failed to load command ${fullCommandName}:`, error.message);
        }
      }
    }
  }

  /**
   * Extract metadata from a command module
   * @param {Object} commandModule - The command module
   * @param {string} commandName - The command name
   * @returns {Object} Command metadata
   */
  extractCommandMetadata(commandModule, commandName) {
    const metadata = {
      name: commandName,
      description: '',
      category: 'general',
      aliases: [],
      options: [],
      arguments: [],
      examples: [],
      dependencies: []
    };

    // Try to extract metadata from module exports
    if (commandModule.metadata) {
      Object.assign(metadata, commandModule.metadata);
    }

    // Try to extract from function name or comments
    if (typeof commandModule === 'function') {
      const functionName = commandModule.name;
      if (functionName && functionName !== 'anonymous') {
        metadata.description = metadata.description || `${functionName} command`;
      }
    }

    // Handle class exports
    if (commandModule && typeof commandModule === 'function' && commandModule.prototype) {
      metadata.description = metadata.description || `${commandName} command`;
      metadata.type = 'class';
    }

    // Default description if none found
    if (!metadata.description) {
      metadata.description = `${commandName} command`;
    }

    return metadata;
  }

  /**
   * Get a specific command by name
   * @param {string} commandName - The command name
   * @returns {Object|null} Command module and metadata
   */
  getCommand(commandName) {
    if (this.discoveredCommands.has(commandName)) {
      return this.discoveredCommands.get(commandName);
    }
    return null;
  }

  /**
   * Get all discovered commands
   * @returns {Map} Map of command names to command data
   */
  getAllCommands() {
    return this.discoveredCommands;
  }

  /**
   * Get commands by category
   * @param {string} category - The category to filter by
   * @returns {Array} Array of commands in the category
   */
  getCommandsByCategory(category) {
    const commands = [];
    for (const [name, data] of this.discoveredCommands) {
      if (data.metadata.category === category) {
        commands.push({ name, ...data });
      }
    }
    return commands;
  }

  /**
   * Validate command structure
   * @param {Object} commandData - Command data to validate
   * @returns {boolean} Whether the command is valid
   */
  validateCommand(commandData) {
    if (!commandData.module) {
      return false;
    }

    if (typeof commandData.module !== 'function') {
      return false;
    }

    return true;
  }

  /**
   * Generate a hash of the commands directory to detect changes
   * @returns {string} Hash of the directory contents
   */
  generateDirectoryHash() {
    if (!fs.existsSync(this.commandsDir)) {
      return '';
    }

    const files = fs.readdirSync(this.commandsDir)
      .filter(file => file.endsWith('.js') && file !== 'index.js')
      .sort();

    const hash = crypto.createHash('md5');
    for (const file of files) {
      const filePath = path.join(this.commandsDir, file);
      const stats = fs.statSync(filePath);
      hash.update(`${file}:${stats.mtime.getTime()}:${stats.size}`);
    }

    return hash.digest('hex');
  }

  /**
   * Load cached commands if available and valid
   * @returns {Array|null} Cached commands or null if cache is invalid
   */
  loadCachedCommands() {
    try {
      if (!fs.existsSync(this.cacheFile)) {
        return null;
      }

      const cacheData = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      const currentHash = this.generateDirectoryHash();

      // Check if cache is still valid
      if (cacheData.hash !== currentHash) {
        return null;
      }

      // Check if cache is not too old (24 hours)
      const cacheAge = Date.now() - cacheData.timestamp;
      if (cacheAge > 24 * 60 * 60 * 1000) {
        return null;
      }

      // Reconstruct commands from cache by reloading modules
      const reconstructedCommands = [];
      for (const [name, data] of cacheData.commands) {
        try {
          const commandPath = path.join(this.commandsDir, `${name}.js`);
          if (fs.existsSync(commandPath)) {
            const commandModule = require(commandPath);
            reconstructedCommands.push([name, {
              module: commandModule,
              metadata: data.metadata
            }]);
          }
        } catch (error) {
          console.warn(`Failed to reconstruct cached command ${name}:`, error.message);
        }
      }

      return reconstructedCommands;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache discovered commands
   */
  cacheCommands() {
    try {
      const cacheData = {
        hash: this.generateDirectoryHash(),
        timestamp: Date.now(),
        commands: Array.from(this.discoveredCommands.entries())
      };

      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      // Silently fail if caching fails
      console.debug('Failed to cache commands:', error.message);
    }
  }

  /**
   * Clear the command cache
   */
  clearCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        fs.unlinkSync(this.cacheFile);
      }
    } catch (error) {
      console.debug('Failed to clear cache:', error.message);
    }
  }
}

module.exports = CommandDiscovery; 