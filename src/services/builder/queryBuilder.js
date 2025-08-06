const { ObjectTypeRegistry } = require('../objectTypes');

/**
 * Query Builder class for constructing GraphQL queries
 * Uses object-oriented approach to eliminate if statements and duplication
 */
class QueryBuilder {
  constructor() {
    this.objectTypeRegistry = new ObjectTypeRegistry();
  }

  /**
   * Build a complete GraphQL query
   * @param {string} objectType - The object type to query
   * @param {Object} options - Query options and filters
   * @returns {Object} - Query and variables
   */
  buildQuery(objectType, options = {}) {
    const normalizedType = this.normalizeObjectType(objectType);
    const fields = this.getFields(objectType, options);
    const whereConditions = this.buildWhereConditions(options);

    let query = `query {
  ${normalizedType}`;

    // Build query arguments
    const queryArgs = [];
    
    if (whereConditions.length > 0) {
      queryArgs.push(`where: {${whereConditions.join(', ')}}`);
    }

    if (queryArgs.length > 0) {
      query += `(${queryArgs.join(', ')})`;
    }

    query += ` {
    ${fields.join('\n    ')}
  }
}`;

    return { query, variables: {} };
  }

  /**
   * Build where conditions from filter options
   * @param {Object} options - Filter options
   * @returns {Array} - Array of where conditions
   */
  buildWhereConditions(options) {
    const conditions = [];
    const filterMap = this.createFilterMap(options);
    
    // Process each filter using the map
    Object.entries(filterMap).forEach(([key, filter]) => {
      if (filter.shouldApply(options)) {
        conditions.push(filter.buildCondition(options[key]));
      }
    });

    return conditions;
  }

  /**
   * Create a map of filter definitions to eliminate if statements
   * @param {Object} options - Filter options
   * @returns {Object} - Filter map
   */
  createFilterMap(options) {
    const filterMap = {
      id: new ExactMatchFilter('id'),
      name: new ExactMatchFilter('name'),
      status: new ExactMatchFilter('status'),
      customerId: new ExactMatchFilter('customerId'),
      subscriptionId: new ExactMatchFilter('subscriptionId'),
      productId: new ExactMatchFilter('productId'),
      sku: new ExactMatchFilter('sku'),
      createdAfter: new DateFilter('createdDate', 'gte'),
      createdBefore: new DateFilter('createdDate', 'lte')
    };

    // Add usage-specific filters
    if (options['usage-id']) {
      filterMap['usage-id'] = new ExactMatchFilter('id');
    }
    if (options.account) {
      filterMap.account = new ExactMatchFilter('salesAccountId');
    }
    if (options.timestamp) {
      filterMap.timestamp = new DateFilter('createdDate', 'eq');
    }

    // Handle active/inactive filters - only one should be applied
    if (options.active && options.inactive) {
      // Both flags set - this is invalid, but we'll prioritize active
      filterMap.active = new BooleanFilter('active');
    } else if (options.active) {
      filterMap.active = new BooleanFilter('active');
    } else if (options.inactive) {
      filterMap.active = new BooleanFilter('active', true); // Inverted
    }

    return filterMap;
  }

  /**
   * Get fields for the query
   * @param {string} objectType - Object type
   * @param {Object} options - Query options
   * @returns {Array} - Array of field names
   */
  getFields(objectType, options) {
    const objectTypeDef = this.objectTypeRegistry.get(objectType);
    return objectTypeDef ? objectTypeDef.getDefaultFields() : ['id', 'name'];
  }

  /**
   * Normalize object type name
   * @param {string} objectType - Object type name
   * @returns {string} - Normalized name
   */
  normalizeObjectType(objectType) {
    const objectTypeDef = this.objectTypeRegistry.get(objectType);
    return objectTypeDef ? objectTypeDef.apiName : objectType;
  }
}

/**
 * Base filter class
 */
class Filter {
  constructor(fieldName) {
    this.fieldName = fieldName;
  }

  shouldApply(options) {
    return options[this.fieldName] !== undefined && options[this.fieldName] !== null;
  }

  buildCondition(value) {
    throw new Error('buildCondition must be implemented by subclass');
  }
}

/**
 * Exact match filter (for strings, IDs)
 */
class ExactMatchFilter extends Filter {
  buildCondition(value) {
    return `${this.fieldName}: {_eq: "${value}"}`;
  }
}

/**
 * Boolean filter
 */
class BooleanFilter extends Filter {
  constructor(fieldName, inverted = false) {
    super(fieldName);
    this.inverted = inverted;
  }

  shouldApply(options) {
    return options[this.fieldName] === true || options[this.fieldName] === false;
  }

  buildCondition(value) {
    const boolValue = this.inverted ? !value : value;
    return `${this.fieldName}: {_eq: ${boolValue}}`;
  }
}

/**
 * Date filter with relative date support
 */
class DateFilter extends Filter {
  constructor(fieldName, operator) {
    super(fieldName);
    this.operator = operator; // 'gte' or 'lte'
  }

  buildCondition(value) {
    const date = this.parseDateFilter(value);
    return `${this.fieldName}: {_${this.operator}: "${date}"}`;
  }

  /**
   * Parse date filter string with support for relative dates
   * @param {string} dateFilter - Date filter string
   * @returns {string} - ISO date string
   */
  parseDateFilter(dateFilter) {
    if (!dateFilter) return null;

    // Check if it's already an ISO date
    if (dateFilter.match(/^\d{4}-\d{2}-\d{2}/)) {
      return dateFilter;
    }

    // Handle relative dates like "1 day ago"
    const now = new Date();
    const parts = dateFilter.toLowerCase().split(' ');

    if (parts.length < 3) {
      throw new Error('Invalid date format. Use ISO format or relative like "1 day ago"');
    }

    const amount = parseInt(parts[0]);
    const unit = parts[1];
    const direction = parts[2];

    if (isNaN(amount)) {
      throw new Error('Invalid number in date filter');
    }

    let multiplier = 1;
    if (direction === 'ago') {
      multiplier = -1;
    } else if (direction !== 'from' && direction !== 'now') {
      throw new Error('Invalid direction. Use "ago" or "from now"');
    }

    const adjustedDate = new Date(now);

    switch (unit) {
      case 'day':
      case 'days':
        adjustedDate.setDate(now.getDate() + (amount * multiplier));
        break;
      case 'month':
      case 'months':
        adjustedDate.setMonth(now.getMonth() + (amount * multiplier));
        break;
      case 'quarter':
      case 'quarters':
        adjustedDate.setMonth(now.getMonth() + (amount * multiplier * 3));
        break;
      case 'year':
      case 'years':
        adjustedDate.setFullYear(now.getFullYear() + (amount * multiplier));
        break;
      default:
        throw new Error('Invalid time unit. Use day(s), month(s), quarter(s), or year(s)');
    }

    return adjustedDate.toISOString();
  }
}

/**
 * Custom query builder for complex queries
 */
class CustomQueryBuilder {
  /**
   * Build query from file
   * @param {string} queryFilePath - Path to query file
   * @param {string} variablesFilePath - Path to variables file
   * @returns {Object} - Query and variables
   */
  static buildFromFile(queryFilePath, variablesFilePath) {
    const fs = require('fs');
    const query = fs.readFileSync(queryFilePath, 'utf8');
    let variables = {};

    if (variablesFilePath && fs.existsSync(variablesFilePath)) {
      const variablesContent = fs.readFileSync(variablesFilePath, 'utf8');
      variables = JSON.parse(variablesContent);
    }

    return { query, variables };
  }

  /**
   * Build query from string
   * @param {string} queryString - GraphQL query string
   * @param {string} variablesString - GraphQL variables as JSON string
   * @returns {Object} - Query and variables
   */
  static buildFromString(queryString, variablesString) {
    const variables = variablesString ? JSON.parse(variablesString) : {};
    return { query: queryString, variables };
  }
}

module.exports = {
  QueryBuilder,
  Filter,
  ExactMatchFilter,
  BooleanFilter,
  DateFilter,
  CustomQueryBuilder
}; 