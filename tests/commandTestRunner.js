const { CommandRegistry, StrategyRegistry } = require('../src/services/registry');
const { generateAllCommands } = require('../src/services/builder/configurableCommandBuilder');
const { Logger } = require('../src/utils');

/**
 * Comprehensive testing framework for commands and strategies
 */
class CommandTestRunner {
  constructor() {
    this.commandRegistry = new CommandRegistry();
    this.strategyRegistry = new StrategyRegistry();
    this.configurableCommands = new Map();
    this.logger = Logger;
    this.testResults = new Map();
  }

  /**
   * Initialize the test runner
   */
  async initialize() {
    this.logger.info('Initializing test runner...');
    
    // Generate configurable commands
    this.configurableCommands = generateAllCommands();
    
    this.logger.info(`Loaded ${this.commandRegistry.getAllCommands().size} discovered commands`);
    this.logger.info(`Loaded ${this.strategyRegistry.getAllStrategies().size} strategies`);
    this.logger.info(`Generated ${this.configurableCommands.size} configurable commands`);
  }

  /**
   * Test a specific command
   * @param {string} commandName - The command name
   * @param {Object} options - Test options
   * @param {Object} expectedOutput - Expected output
   * @returns {Object} Test result
   */
  async testCommand(commandName, options = {}, expectedOutput = null) {
    this.logger.info(`Testing command: ${commandName}`);
    
    const result = {
      command: commandName,
      success: false,
      error: null,
      output: null,
      duration: 0,
      timestamp: new Date().toISOString()
    };

    try {
      const startTime = Date.now();
      
      // Get command from registry
      const commandData = this.commandRegistry.getCommand(commandName);
      if (!commandData) {
        throw new Error(`Command not found: ${commandName}`);
      }

      // Validate command structure
      const validation = this.commandRegistry.validateCommand(commandName);
      if (!validation.valid) {
        throw new Error(`Command validation failed: ${validation.errors.join(', ')}`);
      }

      // Execute command (mock execution for testing)
      result.output = await this.mockCommandExecution(commandName, options);
      result.success = true;
      
      result.duration = Date.now() - startTime;
      
      // Validate output if expected output provided
      if (expectedOutput) {
        const outputValidation = this.validateOutput(result.output, expectedOutput);
        if (!outputValidation.valid) {
          result.success = false;
          result.error = `Output validation failed: ${outputValidation.errors.join(', ')}`;
        }
      }
      
    } catch (error) {
      result.success = false;
      result.error = error.message;
    }

    this.testResults.set(commandName, result);
    return result;
  }

  /**
   * Test a specific strategy
   * @param {string} strategyName - The strategy name
   * @param {Object} input - Strategy input
   * @param {Object} expectedOutput - Expected output
   * @returns {Object} Test result
   */
  async testStrategy(strategyName, input = {}, expectedOutput = null) {
    this.logger.info(`Testing strategy: ${strategyName}`);
    
    const result = {
      strategy: strategyName,
      success: false,
      error: null,
      output: null,
      duration: 0,
      timestamp: new Date().toISOString()
    };

    try {
      const startTime = Date.now();
      
      // Check if strategy exists
      if (!this.strategyRegistry.hasStrategy(strategyName)) {
        throw new Error(`Strategy not found: ${strategyName}`);
      }

      // Validate strategy configuration
      const validation = this.strategyRegistry.validateStrategyConfig(strategyName, input);
      if (!validation.valid) {
        throw new Error(`Strategy validation failed: ${validation.error}`);
      }

      // Create and execute strategy
      const strategy = this.strategyRegistry.createStrategy(strategyName, input);
      result.output = await strategy.execute(input);
      result.success = true;
      
      result.duration = Date.now() - startTime;
      
      // Validate output if expected output provided
      if (expectedOutput) {
        const outputValidation = this.validateOutput(result.output, expectedOutput);
        if (!outputValidation.valid) {
          result.success = false;
          result.error = `Output validation failed: ${outputValidation.errors.join(', ')}`;
        }
      }
      
    } catch (error) {
      result.success = false;
      result.error = error.message;
    }

    this.testResults.set(`strategy:${strategyName}`, result);
    return result;
  }

  /**
   * Test all commands
   * @param {Object} testOptions - Test options
   * @returns {Array} Array of test results
   */
  async testAllCommands(testOptions = {}) {
    this.logger.info('Testing all commands...');
    
    const results = [];
    const commands = this.commandRegistry.getAllCommands();
    
    for (const [commandName, commandData] of commands) {
      try {
        const result = await this.testCommand(commandName, testOptions[commandName] || {});
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to test command ${commandName}:`, error.message);
        results.push({
          command: commandName,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  /**
   * Test all strategies
   * @param {Object} testInputs - Test inputs for strategies
   * @returns {Array} Array of test results
   */
  async testAllStrategies(testInputs = {}) {
    this.logger.info('Testing all strategies...');
    
    const results = [];
    const strategies = this.strategyRegistry.getAllStrategies();
    
    for (const [strategyName, strategyData] of strategies) {
      try {
        const input = testInputs[strategyName] || {};
        const result = await this.testStrategy(strategyName, input);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to test strategy ${strategyName}:`, error.message);
        results.push({
          strategy: strategyName,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  /**
   * Test configurable commands
   * @param {Object} testOptions - Test options
   * @returns {Array} Array of test results
   */
  async testConfigurableCommands(testOptions = {}) {
    this.logger.info('Testing configurable commands...');
    
    const results = [];
    
    for (const [commandName, commandBuilder] of this.configurableCommands) {
      try {
        // Test command configuration validation
        const validation = commandBuilder.validate();
        
        const result = {
          command: commandName,
          success: validation.valid,
          error: validation.valid ? null : validation.errors.join(', '),
          warnings: validation.warnings,
          config: commandBuilder.config,
          timestamp: new Date().toISOString()
        };
        
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to test configurable command ${commandName}:`, error.message);
        results.push({
          command: commandName,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  /**
   * Mock command execution for testing
   * @param {string} commandName - The command name
   * @param {Object} options - Command options
   * @returns {Object} Mock output
   */
  async mockCommandExecution(commandName, options) {
    // Simulate command execution
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async operation
    
    return {
      command: commandName,
      options: options,
      status: 'success',
      timestamp: new Date().toISOString(),
      mock: true
    };
  }

  /**
   * Validate output against expected output
   * @param {Object} actual - Actual output
   * @param {Object} expected - Expected output
   * @returns {Object} Validation result
   */
  validateOutput(actual, expected) {
    const errors = [];
    
    // Check if output has required fields
    for (const [key, value] of Object.entries(expected)) {
      if (!(key in actual)) {
        errors.push(`Missing field: ${key}`);
      } else if (typeof value !== typeof actual[key]) {
        errors.push(`Type mismatch for field ${key}: expected ${typeof value}, got ${typeof actual[key]}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate test report
   * @returns {Object} Test report
   */
  generateTestReport() {
    const results = Array.from(this.testResults.values());
    const total = results.length;
    const passed = results.filter(r => r.success).length;
    const failed = total - passed;
    
    const report = {
      summary: {
        total,
        passed,
        failed,
        successRate: total > 0 ? (passed / total * 100).toFixed(2) + '%' : '0%'
      },
      results: results,
      timestamp: new Date().toISOString()
    };
    
    // Group results by type
    report.byType = {
      commands: results.filter(r => r.command && !r.strategy),
      strategies: results.filter(r => r.strategy),
      configurable: results.filter(r => r.config)
    };
    
    return report;
  }

  /**
   * Run comprehensive test suite
   * @param {Object} options - Test options
   * @returns {Object} Test report
   */
  async runTestSuite(options = {}) {
    this.logger.info('Running comprehensive test suite...');
    
    await this.initialize();
    
    const results = [];
    
    // Test discovered commands
    if (options.testCommands !== false) {
      const commandResults = await this.testAllCommands(options.commandOptions || {});
      results.push(...commandResults);
    }
    
    // Test strategies
    if (options.testStrategies !== false) {
      const strategyResults = await this.testAllStrategies(options.strategyInputs || {});
      results.push(...strategyResults);
    }
    
    // Test configurable commands
    if (options.testConfigurable !== false) {
      const configurableResults = await this.testConfigurableCommands(options.configurableOptions || {});
      results.push(...configurableResults);
    }
    
    // Generate and return report
    const report = this.generateTestReport();
    this.logger.info(`Test suite completed. Success rate: ${report.summary.successRate}`);
    
    return report;
  }

  /**
   * Save test results to file
   * @param {string} filePath - Output file path
   * @param {Object} report - Test report
   */
  saveTestResults(filePath, report) {
    const fs = require('fs');
    const content = JSON.stringify(report, null, 2);
    fs.writeFileSync(filePath, content);
    this.logger.info(`Test results saved to: ${filePath}`);
  }

  /**
   * Load test results from file
   * @param {string} filePath - Input file path
   * @returns {Object} Test report
   */
  loadTestResults(filePath) {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf8');
    const report = JSON.parse(content);
    
    // Restore test results
    this.testResults.clear();
    for (const result of report.results) {
      const key = result.strategy ? `strategy:${result.strategy}` : result.command;
      this.testResults.set(key, result);
    }
    
    return report;
  }
}

module.exports = CommandTestRunner; 