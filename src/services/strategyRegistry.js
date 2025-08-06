const StrategyDiscovery = require('./strategyDiscovery');

/**
 * Enhanced Strategy Registry with auto-registration
 */
class StrategyRegistry {
  constructor() {
    this.strategies = new Map();
    this.factories = new Map();
    this.discovery = new StrategyDiscovery();
    this.autoRegisterStrategies();
  }

  /**
   * Auto-register all discovered strategies
   */
  autoRegisterStrategies() {
    const discoveredStrategies = this.discovery.discoverStrategies();
    
    for (const strategy of discoveredStrategies) {
      this.registerStrategy(strategy.name, strategy.module, strategy.metadata);
    }
  }

  /**
   * Register a strategy with the registry
   * @param {string} name - Strategy name
   * @param {Object} strategyClass - Strategy class or factory function
   * @param {Object} metadata - Strategy metadata
   */
  registerStrategy(name, strategyClass, metadata = {}) {
    this.strategies.set(name, {
      class: strategyClass,
      metadata: metadata
    });

    // Auto-register factory if it's a factory function
    if (typeof strategyClass === 'function' && strategyClass.name && strategyClass.name.includes('Factory')) {
      this.registerFactory(name, strategyClass);
    }
  }

  /**
   * Register a strategy factory
   * @param {string} name - Factory name
   * @param {Function} factory - Factory function
   */
  registerFactory(name, factory) {
    this.factories.set(name, factory);
  }

  /**
   * Create a strategy instance
   * @param {string} name - Strategy name
   * @param {Object} options - Strategy options
   * @param {Object} apiClient - API client instance
   * @returns {Object} Strategy instance
   */
  createStrategy(name, options = {}, apiClient = null) {
    const strategyData = this.strategies.get(name);
    
    if (!strategyData) {
      throw new Error(`Strategy not found: ${name}`);
    }

    const { class: StrategyClass } = strategyData;

    // Check if it's a factory function
    if (typeof StrategyClass === 'function' && this.factories.has(name)) {
      return this.factories.get(name)(options, apiClient);
    }

    // Check if it's a class constructor
    if (typeof StrategyClass === 'function' && StrategyClass.prototype && StrategyClass.prototype.constructor) {
      return new StrategyClass(options, apiClient);
    }

    // Check if it's a factory object with create method
    if (StrategyClass && typeof StrategyClass.create === 'function') {
      return StrategyClass.create(options, apiClient);
    }

    // Return the strategy as-is if it's already an instance
    return StrategyClass;
  }

  /**
   * Get strategy metadata
   * @param {string} name - Strategy name
   * @returns {Object|null} Strategy metadata
   */
  getStrategyMetadata(name) {
    const strategyData = this.strategies.get(name);
    return strategyData ? strategyData.metadata : null;
  }

  /**
   * Get all registered strategies
   * @returns {Map} Map of strategy names to strategy data
   */
  getAllStrategies() {
    return this.strategies;
  }

  /**
   * Get strategies by type
   * @param {string} type - Strategy type
   * @returns {Array} Array of strategies of the specified type
   */
  getStrategiesByType(type) {
    const strategies = [];
    for (const [name, data] of this.strategies) {
      if (data.metadata.type === type) {
        strategies.push({ name, ...data });
      }
    }
    return strategies;
  }

  /**
   * Check if a strategy exists
   * @param {string} name - Strategy name
   * @returns {boolean} Whether the strategy exists
   */
  hasStrategy(name) {
    return this.strategies.has(name);
  }

  /**
   * Remove a strategy from the registry
   * @param {string} name - Strategy name
   */
  removeStrategy(name) {
    this.strategies.delete(name);
    this.factories.delete(name);
  }

  /**
   * Clear all strategies
   */
  clear() {
    this.strategies.clear();
    this.factories.clear();
  }

  /**
   * Get strategy info for help/listing
   * @returns {Array} Array of strategy information
   */
  getStrategyInfo() {
    const info = [];
    for (const [name, data] of this.strategies) {
      info.push({
        name,
        description: data.metadata.description || 'No description available',
        type: data.metadata.type || 'unknown',
        supportedOperations: data.metadata.supportedOperations || []
      });
    }
    return info;
  }

  /**
   * Validate strategy configuration
   * @param {string} name - Strategy name
   * @param {Object} options - Strategy options
   * @returns {Object} Validation result
   */
  validateStrategyConfig(name, options = {}) {
    const strategyData = this.strategies.get(name);
    if (!strategyData) {
      return { valid: false, error: `Strategy not found: ${name}` };
    }

    const { metadata } = strategyData;
    const errors = [];

    // Check required options
    if (metadata.requiredOptions) {
      for (const requiredOption of metadata.requiredOptions) {
        if (!(requiredOption in options)) {
          errors.push(`Missing required option: ${requiredOption}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      metadata
    };
  }
}

module.exports = StrategyRegistry; 