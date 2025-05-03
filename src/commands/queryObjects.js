const chalk = require('chalk');
const axios = require('axios');
const { checkAndPromptForApiKey } = require('../utils/apiKeyUtils');

/**
 * Handles querying of different object types in the Nue platform using GraphQL
 * @param {Object} program - Commander program instance
 */
module.exports = function(program) {
  program
    .command('query <objectType>')
    .description('Query objects in the Nue platform (subscriptions, customers, orders)')
    .option('--sandbox', 'Use sandbox environment', false)
    .option('--id <id>', 'Filter by ID')
    .option('--name <name>', 'Filter by name')
    .option('--status <status>', 'Filter by status')
    .option('--customer-id <customerId>', 'Filter by customer ID')
    .option('--limit <number>', 'Limit the number of results', parseInt, 10)
    .option('--page <number>', 'Page number for pagination', parseInt, 1)
    .option('--verbose', 'Show detailed output information', false)
    .action(async (objectType, options) => {
      try {
        // Validate object type
        const validObjectTypes = ['subscription', 'subscriptions', 'customer', 'customers', 'order', 'orders'];
        if (!validObjectTypes.includes(objectType.toLowerCase())) {
          console.error(chalk.red(`Error: Invalid object type '${objectType}'. Valid types are: subscription(s), customer(s), order(s)`));
          process.exit(1);
        }
        
        if (options.verbose) {
          console.log(chalk.blue(`Querying ${objectType} with filters...`));
        } else {
          console.log(chalk.blue(`Querying ${objectType}...`));
        }
        
        // API URL is the same for all environments, only the API key changes
        const apiBaseUrl = process.env.NUE_API_URL || 'https://api.nue.io';
        
        // Use the utility to check for the API key and prompt if not found
        const apiKey = await checkAndPromptForApiKey(options.sandbox);
        
        if (!apiKey) {
          console.error(chalk.red(`Unable to proceed without API key`));
          process.exit(1);
        }
        
        // Normalize object type for GraphQL query
        const normalizedType = normalizeObjectType(objectType);
        
        // Build GraphQL query and variables based on the corrected schema
        const { query, variables } = buildGraphQLQuery(normalizedType, options);
        
        if (options.verbose) {
          console.log(chalk.gray('GraphQL Query:'));
          console.log(chalk.gray(query));
          if (Object.keys(variables).length > 0) {
            console.log(chalk.gray('Variables:'));
            console.log(chalk.gray(JSON.stringify(variables, null, 2)));
          }
        }
        
        // Make GraphQL API call
        const response = await axios.post(`${apiBaseUrl}/v1/async/graphql`, 
          {
            query,
            variables
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'nue-api-key': apiKey
            }
          }
        );
        
        // Process and display GraphQL results
        handleGraphQLResponse(response, normalizedType, options);
        
      } catch (error) {
        console.error(chalk.red(`Error querying ${objectType}:`));
        if (error.response) {
          if (options.verbose) {
            console.error(chalk.red(`Status: ${error.response.status}`));
            console.error(chalk.red(JSON.stringify(error.response.data, null, 2)));
          } else {
            console.error(chalk.red(`Status: ${error.response.status}`));
            if (error.response.data && error.response.data.errors) {
              error.response.data.errors.forEach(err => {
                console.error(chalk.red(err.message));
              });
            } else if (error.response.data && error.response.data.error) {
              console.error(chalk.red(error.response.data.error));
            }
          }
        } else {
          console.error(chalk.red(error.message));
        }
        process.exit(1);
      }
    });
};

/**
 * Normalize object type for GraphQL query
 * @param {string} objectType - The object type from command line
 * @returns {string} - Normalized object type for GraphQL
 */
function normalizeObjectType(objectType) {
  const type = objectType.toLowerCase();
  
  if (type === 'subscription' || type === 'subscriptions') {
    return 'subscriptions';
  } else if (type === 'customer' || type === 'customers') {
    return 'customers';
  } else if (type === 'order' || type === 'orders') {
    return 'orders';
  }
  
  return type;
}

/**
 * Build GraphQL query and variables based on object type and options
 * @param {string} objectType - The normalized object type
 * @param {Object} options - Command options
 * @returns {Object} - GraphQL query and variables
 */
function buildGraphQLQuery(objectType, options) {
  let query = '';
  const variables = {};
  
  // Remove pagination handling since it's not supported by the API
  
  if (objectType === 'subscriptions') {
    // Build where clause for filtering
    const whereConditions = [];
    
    if (options.id) {
      whereConditions.push(`id: {_eq: "${options.id}"}`);
    }
    
    if (options.name) {
      whereConditions.push(`name: {_eq: "${options.name}"}`);
    }
    
    if (options.status) {
      whereConditions.push(`status: {_eq: "${options.status}"}`);
    }
    
    if (options.customerId) {
      whereConditions.push(`customerId: {_eq: "${options.customerId}"}`);
    }
    
    let whereClause = '';
    if (whereConditions.length > 0) {
      whereClause = `where: {${whereConditions.join(', ')}}`;
    }
    
    // Only use the where clause, no pagination
    let filterParams = whereClause ? `(${whereClause})` : '';
    
    // Build the correct query structure based on the API schema
    query = `query {
  Subscription${filterParams} {
    id
    listPrice
    orderProductId
    status
    name
    autoRenew
    billCycleDay
    billingPeriod
    billingTiming
    bundled
    createdDate
    evergreen
    productId
    customerId
    subscriptionStartDate
    subscriptionEndDate
    subscriptionTerm
    actualSubscriptionTerm
  }
}`;
  } else if (objectType === 'customers') {
    // Build where clause for filtering
    const whereConditions = [];
    
    if (options.id) {
      whereConditions.push(`id: {_eq: "${options.id}"}`);
    }
    
    if (options.name) {
      whereConditions.push(`name: {_eq: "${options.name}"}`);
    }
    
    if (options.status) {
      whereConditions.push(`status: {_eq: "${options.status}"}`);
    }
    
    let whereClause = '';
    if (whereConditions.length > 0) {
      whereClause = `where: {${whereConditions.join(', ')}}`;
    }
    
    // Only use the where clause, no pagination
    let filterParams = whereClause ? `(${whereClause})` : '';
    
    // Build the correct query structure
    query = `query {
  Customer${filterParams} {
    id
    name
    email
    phone
    status
    billingAddress
  }
}`;
  } else if (objectType === 'orders') {
    // Build where clause for filtering
    const whereConditions = [];
    
    if (options.id) {
      whereConditions.push(`id: {_eq: "${options.id}"}`);
    }
    
    if (options.name) {
      whereConditions.push(`orderNumber: {_eq: "${options.name}"}`);
    }
    
    if (options.status) {
      whereConditions.push(`status: {_eq: "${options.status}"}`);
    }
    
    if (options.customerId) {
      whereConditions.push(`customerId: {_eq: "${options.customerId}"}`);
    }
    
    let whereClause = '';
    if (whereConditions.length > 0) {
      whereClause = `where: {${whereConditions.join(', ')}}`;
    }
    
    // Only use the where clause, no pagination
    let filterParams = whereClause ? `(${whereClause})` : '';
    
    // Build the correct query structure
    query = `query {
  Order${filterParams} {
    id
    orderNumber
    status
    customerId
    orderStartDate
    totalAmount
    subscriptionStartDate
    subscriptionEndDate
    subscriptionTerm
  }
}`;
  }
  
  return { query, variables };
}

/**
 * Handle and display GraphQL API response
 * @param {Object} response - API response
 * @param {string} objectType - The normalized object type
 * @param {Object} options - Command options
 */
function handleGraphQLResponse(response, objectType, options) {
  if (!response.data || response.data.errors) {
    console.error(chalk.red('Error: Invalid response from GraphQL API'));
    if (response.data && response.data.errors) {
      response.data.errors.forEach(err => {
        console.error(chalk.red(`- ${err.message}`));
      });
    }
    return;
  }
  
  // Extract results from GraphQL response consistently for both verbose and non-verbose modes
  let results = [];
  
  // Handle the response data structure based on the provided GraphQL query format
  if (objectType === 'subscriptions' && response.data.data && response.data.data.Subscription) {
    results = response.data.data.Subscription;
  } else if (objectType === 'customers' && response.data.data && response.data.data.Customer) {
    results = response.data.data.Customer;
  } else if (objectType === 'orders' && response.data.data && response.data.data.Order) {
    results = response.data.data.Order;
  }

  if (options.verbose) {
    console.log(chalk.green(`${objectType.charAt(0).toUpperCase() + objectType.slice(1)} query successful!`));
    console.log(chalk.green('Response data:'));
    
    // Show the results in verbose mode
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  // Non-verbose display format
  console.log(chalk.green(`${objectType.charAt(0).toUpperCase() + objectType.slice(1)} query successful!`));
  
  if (!results || results.length === 0) {
    console.log(chalk.yellow(`No ${objectType} found matching your criteria.`));
    return;
  }
  
  // Display summary of results
  const totalCount = results.length;
  console.log(chalk.green(`\nFound ${totalCount} ${objectType}:`));
  
  // Create a table-like formatted output for results
  displayResultsTable(results, objectType);
  
  // Display individual items with more details
  results.forEach((item, index) => {
    displayItem(item, objectType, index);
  });
}

/**
 * Display a table-like summary of results
 * @param {Array} results - Results to display
 * @param {string} objectType - The normalized object type
 */
function displayResultsTable(results, objectType) {
  if (results.length === 0) return;
  
  // Define columns based on object type
  let headerColumns = [];
  let dataRowFn;
  
  if (objectType === 'subscriptions') {
    headerColumns = ['ID', 'Name', 'Status', 'External Name', 'Product ID'];
    dataRowFn = (item) => [
      truncate(item.id || '-', 10),
      truncate(item.name || '-', 25),
      item.status || '-',
      truncate(item.externalName || '-', 25),
      truncate(item.productId || '-', 15)
    ];
  } else if (objectType === 'customers') {
    headerColumns = ['ID', 'Name', 'Email', 'Status'];
    dataRowFn = (item) => [
      truncate(item.id || '-', 10),
      truncate(item.name || '-', 25),
      truncate(item.email || '-', 30),
      item.status || '-'
    ];
  } else if (objectType === 'orders') {
    headerColumns = ['ID', 'Order Number', 'Status', 'Customer ID', 'Total'];
    dataRowFn = (item) => [
      truncate(item.id || '-', 10),
      item.orderNumber || '-',
      item.status || '-',
      truncate(item.customerId || '-', 15),
      formatAmount(item.totalAmount)
    ];
  }
  
  // Calculate column widths
  const columnWidths = determineColumnWidths(results, headerColumns, dataRowFn);
  
  // Create table header
  const headerRow = headerColumns.map((header, i) => 
    header.padEnd(columnWidths[i])
  ).join(' | ');
  
  const separator = columnWidths.map(width => 
    '-'.repeat(width)
  ).join('-+-');
  
  console.log(chalk.cyan('\n' + headerRow));
  console.log(chalk.cyan(separator));
  
  // Create table rows
  results.forEach(item => {
    const rowData = dataRowFn(item);
    const row = rowData.map((cell, i) => 
      cell.toString().padEnd(columnWidths[i])
    ).join(' | ');
    console.log(row);
  });
  
  console.log('\n');
}

/**
 * Determine optimal column widths for table display
 * @param {Array} items - Data items to display
 * @param {Array} headers - Column headers
 * @param {Function} dataRowFn - Function to extract row data
 * @returns {Array} - Array of column widths
 */
function determineColumnWidths(items, headers, dataRowFn) {
  // Start with header lengths
  const widths = headers.map(h => h.length);
  
  // Check data widths
  items.forEach(item => {
    const rowData = dataRowFn(item);
    rowData.forEach((cell, i) => {
      const cellWidth = cell.toString().length;
      if (cellWidth > widths[i]) {
        widths[i] = cellWidth;
      }
    });
  });
  
  // Add some padding and cap very wide columns
  return widths.map(w => Math.min(w + 2, 40));
}

/**
 * Truncate a string if it's too long
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated string
 */
function truncate(str, maxLength) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
}

/**
 * Format amount with currency symbol if available
 * @param {number|string} amount - Amount to format
 * @returns {string} - Formatted amount
 */
function formatAmount(amount) {
  if (!amount) return '-';
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return '$' + num.toFixed(2);
}

/**
 * Display an individual item in the results
 * @param {Object} item - Item to display
 * @param {string} objectType - The normalized object type
 * @param {number} index - Item index in the results
 */
function displayItem(item, objectType, index) {
  // Create a section header for each item
  const headerText = `${objectType.slice(0, -1).toUpperCase()} #${index + 1} DETAILS`;
  const headerBar = '='.repeat(headerText.length);
  
  console.log(chalk.green(`\n${headerBar}`));
  console.log(chalk.green(headerText));
  console.log(chalk.green(headerBar));
  
  if (objectType === 'subscriptions') {
    const fields = [
      { label: 'ID', value: item.id },
      { label: 'Name', value: item.name },
      { label: 'Status', value: item.status },
      { label: 'External Name', value: item.externalName },
      { label: 'External ID', value: item.externalId },
      { label: 'Product ID', value: item.productId },
      { label: 'End Date', value: item.subscriptionEndDate },
      { label: 'Billing Period', value: item.billingPeriod },
      { label: 'Billing Timing', value: item.billingTiming },
      { label: 'Bill Cycle Day', value: item.billCycleDay },
      { label: 'Auto Renew', value: item.autoRenew ? 'Yes' : 'No' },
      { label: 'Evergreen', value: item.evergreen ? 'Yes' : 'No' },
      { label: 'Bundled', value: item.bundled ? 'Yes' : 'No' },
      { label: 'Created Date', value: item.createdDate },
      { label: 'Customer ID', value: item.customerId }
    ];
    displayFormattedFields(fields);
  } else if (objectType === 'customers') {
    const fields = [
      { label: 'ID', value: item.id },
      { label: 'Name', value: item.name },
      { label: 'Email', value: item.email },
      { label: 'Phone', value: item.phone },
      { label: 'Status', value: item.status },
      { label: 'Billing Address', value: item.billingAddress }
    ];
    displayFormattedFields(fields);
  } else if (objectType === 'orders') {
    const fields = [
      { label: 'ID', value: item.id },
      { label: 'Order Number', value: item.orderNumber },
      { label: 'Status', value: item.status },
      { label: 'Customer ID', value: item.customerId },
      { label: 'Order Date', value: item.orderStartDate },
      { label: 'Total Amount', value: formatAmount(item.totalAmount) },
      { label: 'Subscription Start', value: item.subscriptionStartDate },
      { label: 'Subscription End', value: item.subscriptionEndDate },
      { label: 'Subscription Term', value: item.subscriptionTerm ? `${item.subscriptionTerm} months` : null }
    ];
    displayFormattedFields(fields);
  }
}

/**
 * Display formatted fields in a consistent layout
 * @param {Array} fields - Array of {label, value} objects
 */
function displayFormattedFields(fields) {
  // Find the longest label for alignment
  const labelWidth = Math.max(...fields.map(f => f.label.length));
  
  fields.forEach(field => {
    if (field.value !== undefined && field.value !== null) {
      const label = field.label.padEnd(labelWidth + 2);
      console.log(`${chalk.cyan(label)}: ${field.value}`);
    }
  });
}