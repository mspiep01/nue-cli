const fs = require('fs');
const path = require('path');

/**
 * Auto-discovery system for strategies
 */
class StrategyDiscovery {
  constructor(strategiesDir = path.join(__dirname, './strategy')) {
    this.strategiesDir = strategiesDir;
    this.discoveredStrategies = new Map();
  }

  /**
   * Discover all strategies in the strategy directory
   * @returns {Array} Array of strategy metadata
   */
  discoverStrategies() {
    const strategies = [];
    
    if (!fs.existsSync(this.strategiesDir)) {
      console.warn(`Strategies directory not found: ${this.strategiesDir}`);
      return strategies;
    }

    const files = fs.readdirSync(this.strategiesDir);
    
    for (const file of files) {
      if (file.endsWith('.js') && file !== 'index.js') {
        const strategyName = path.basename(file, '.js');
        const strategyPath = path.join(this.strategiesDir, file);
        
        try {
          const strategyModule = require(strategyPath);
          const metadata = this.extractStrategyMetadata(strategyModule, strategyName);
          
          strategies.push({
            name: strategyName,
            path: strategyPath,
            module: strategyModule,
            metadata
          });
          
          this.discoveredStrategies.set(strategyName, {
            module: strategyModule,
            metadata
          });
        } catch (error) {
          console.warn(`Failed to load strategy ${strategyName}:`, error.message);
        }
      }
    }

    return strategies;
  }

  /**
   * Extract metadata from a strategy module
   * @param {Object} strategyModule - The strategy module
   * @param {string} strategyName - The strategy name
   * @returns {Object} Strategy metadata
   */
  extractStrategyMetadata(strategyModule, strategyName) {
    const metadata = {
      name: strategyName,
      type: 'unknown',
      description: '',
      supportedOperations: [],
      requiredOptions: [],
      optionalOptions: [],
      examples: []
    };

    // Try to extract metadata from module exports
    if (strategyModule.metadata) {
      Object.assign(metadata, strategyModule.metadata);
    }

    // Try to extract from class name or function name
    if (strategyModule.name) {
      metadata.description = metadata.description || `${strategyModule.name} strategy`;
    }

    // Default description if none found
    if (!metadata.description) {
      metadata.description = `${strategyName} strategy`;
    }

    return metadata;
  }

  /**
   * Get a specific strategy by name
   * @param {string} strategyName - The strategy name
   * @returns {Object|null} Strategy module and metadata
   */
  getStrategy(strategyName) {
    if (this.discoveredStrategies.has(strategyName)) {
      return this.discoveredStrategies.get(strategyName);
    }
    return null;
  }

  /**
   * Get all discovered strategies
   * @returns {Map} Map of strategy names to strategy data
   */
  getAllStrategies() {
    return this.discoveredStrategies;
  }

  /**
   * Get strategies by type
   * @param {string} type - The type to filter by
   * @returns {Array} Array of strategies of the specified type
   */
  getStrategiesByType(type) {
    const strategies = [];
    for (const [name, data] of this.discoveredStrategies) {
      if (data.metadata.type === type) {
        strategies.push({ name, ...data });
      }
    }
    return strategies;
  }

  /**
   * Validate strategy structure
   * @param {Object} strategyData - Strategy data to validate
   * @returns {boolean} Whether the strategy is valid
   */
  validateStrategy(strategyData) {
    if (!strategyData.module) {
      return false;
    }

    // Check if it's a class or function
    if (typeof strategyData.module !== 'function' && typeof strategyData.module !== 'object') {
      return false;
    }

    return true;
  }
}

module.exports = StrategyDiscovery; 