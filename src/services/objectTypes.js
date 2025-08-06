/**
 * Object Type Definitions and Management
 * 
 * This module provides a structured, maintainable approach to managing object types
 * in the Nue CLI. It uses a class-based system with clear separation of concerns
 * and provides type safety through well-defined interfaces.
 */

/**
 * Base class for object type definitions
 */
class ObjectType {
  constructor(name, apiName, category, fields = []) {
    this.name = name;
    this.apiName = apiName;
    this.category = category;
    this.fields = fields;
    this.formFieldName = this.generateFormFieldName();
  }

  /**
   * Generate form field name for import operations
   */
  generateFormFieldName() {
    // Default implementation - can be overridden by subclasses
    const formFieldMap = {
      'pricebook': 'price-book',
      'pricetag': 'price-tag',
      'credittype': 'credit-type',
      'creditpool': 'credit-pool',
      'creditconversion': 'credit-conversion',
      'productgroup': 'product-group',
      'bundlesuite': 'bundle-suite',
      'customsetting': 'custom-setting'
    };
    
    return formFieldMap[this.name] || this.name;
  }

  /**
   * Check if this object type matches the given name (case-insensitive)
   */
  matches(name) {
    return this.name.toLowerCase() === name.toLowerCase() || 
           this.apiName.toLowerCase() === name.toLowerCase();
  }

  /**
   * Get all valid names for this object type
   */
  getValidNames() {
    return [this.name, this.apiName];
  }

  /**
   * Check if this object type is in the given category
   */
  isInCategory(category) {
    return this.category === category;
  }

  /**
   * Get default fields if none are specified
   */
  getDefaultFields() {
    return this.fields.length > 0 ? this.fields : ['id', 'name', 'createdDate', 'lastModifiedDate'];
  }
}

/**
 * Product Catalog Object Types
 */
class ProductCatalogObjectType extends ObjectType {
  constructor(name, apiName, fields = []) {
    super(name, apiName, 'product_catalog', fields);
  }
}

/**
 * Transaction Object Types
 */
class TransactionObjectType extends ObjectType {
  constructor(name, apiName, fields = []) {
    super(name, apiName, 'transaction', fields);
  }
}

/**
 * Transaction Hub Object Types
 */
class TransactionHubObjectType extends ObjectType {
  constructor(name, apiName, fields = []) {
    super(name, apiName, 'transaction_hub', fields);
  }
}

/**
 * Object Type Registry
 * Central registry for all object type definitions
 */
class ObjectTypeRegistry {
  constructor() {
    this.types = new Map();
    this.initializeTypes();
  }

  /**
   * Initialize all object type definitions
   */
  initializeTypes() {
    // Product Catalog Objects
    this.register(new ProductCatalogObjectType('product', 'Product', [
      'id', 'name', 'sku', 'description', 'longDescription', 'status', 'active',
      'autoRenew', 'billingPeriod', 'billingTiming', 'configurable', 'createdDate',
      'lastModifiedDate', 'priceBookId', 'priceModel', 'productCategory', 'recordType',
      'referenceProductId', 'showIncludedProductOptions', 'soldIndependently', 'startDate',
      'endDate', 'freeTrialType', 'freeTrialUnit', 'imageUrl', 'defaultRenewalTerm',
      'defaultSubscriptionTerm', 'defaultUomId', 'creditConversionId', 'creditPoolId',
      'externalId', 'evergreen', 'bundleTemplate', 'carvesEligible', 'carvesLiabilitySegment',
      'carvesRevenueSegment', 'contractLiabilitySegment', 'contractRevenueSegment',
      'lastPublishedById', 'lastPublishedDate', 'publishStatus', 'productCode', 'taxCategory',
      'taxCode', 'taxMode', 'revenueRuleExternalId'
    ]));

    this.register(new ProductCatalogObjectType('uom', 'UOM', [
      'id', 'name', 'active', 'decimalScale', 'quantityDimension', 'roundingMode',
      'termDimension', 'unitCode', 'externalId', 'createdDate', 'lastModifiedDate'
    ]));

    this.register(new ProductCatalogObjectType('pricebook', 'PriceBook', [
      'id', 'name', 'active', 'currency', 'description', 'createdDate', 'lastModifiedDate'
    ]));

    this.register(new ProductCatalogObjectType('pricetag', 'PriceTag', [
      'id', 'name', 'active', 'price', 'currency', 'priceBookId', 'productId',
      'createdDate', 'lastModifiedDate'
    ]));

    this.register(new ProductCatalogObjectType('credittype', 'CreditType', [
      'id', 'name', 'active', 'description', 'createdDate', 'lastModifiedDate'
    ]));

    this.register(new ProductCatalogObjectType('creditpool', 'CreditPool', [
      'id', 'name', 'active', 'description', 'creditTypeId', 'createdDate', 'lastModifiedDate'
    ]));

    this.register(new ProductCatalogObjectType('creditconversion', 'CreditConversion', [
      'id', 'name', 'active', 'fromUomId', 'toUomId', 'conversionRate', 'createdDate', 'lastModifiedDate'
    ]));

    this.register(new ProductCatalogObjectType('productgroup', 'ProductGroup', [
      'id', 'name', 'active', 'description', 'createdDate', 'lastModifiedDate'
    ]));

    this.register(new ProductCatalogObjectType('bundle', 'Bundle', [
      'id', 'name', 'active', 'description', 'createdDate', 'lastModifiedDate'
    ]));

    this.register(new ProductCatalogObjectType('bundlesuite', 'BundleSuite', [
      'id', 'name', 'active', 'description', 'createdDate', 'lastModifiedDate'
    ]));

    this.register(new ProductCatalogObjectType('customsetting', 'CustomSetting', [
      'id', 'name', 'value', 'createdDate', 'lastModifiedDate'
    ]));

    // Transaction Objects
    this.register(new TransactionObjectType('subscription', 'Subscription', [
      'id', 'name', 'status', 'autoRenew', 'billingPeriod', 'billingTiming', 'bundled',
      'createdDate', 'evergreen', 'productId', 'customerId', 'subscriptionStartDate',
      'subscriptionEndDate', 'subscriptionTerm', 'actualSubscriptionTerm', 'listPrice',
      'orderProductId', 'billCycleDay'
    ]));

    this.register(new TransactionObjectType('customer', 'Customer', [
      'id', 'name', 'email', 'phone', 'createdDate', 'lastModifiedDate'
    ]));

    this.register(new TransactionObjectType('order', 'Order', [
      'id', 'orderNumber', 'status', 'customerId', 'orderStartDate', 'totalAmount',
      'subscriptionStartDate', 'subscriptionEndDate', 'subscriptionTerm', 'createdDate', 'lastModifiedDate'
    ]));

    this.register(new TransactionObjectType('usage', 'Usage', [
      'id', 'name', 'customerId', 'subscriptionId', 'salesAccountId', 'quantity',
      'createdDate', 'lastModifiedDate', 'properties'
    ]));

    this.register(new TransactionObjectType('invoice', 'Invoice', [
      'id', 'invoiceNumber', 'status', 'customerId', 'invoiceDate', 'dueDate', 'totalAmount',
      'createdDate', 'lastModifiedDate'
    ]));

    this.register(new TransactionObjectType('creditmemo', 'CreditMemo', [
      'id', 'creditMemoNumber', 'status', 'customerId', 'creditMemoDate', 'totalAmount',
      'createdDate', 'lastModifiedDate'
    ]));

    // Transaction Hub Objects
    this.register(new TransactionHubObjectType('transactionhub', 'TransactionHub', []));
  }

  /**
   * Register an object type
   */
  register(objectType) {
    // Register by all valid names
    objectType.getValidNames().forEach(name => {
      this.types.set(name.toLowerCase(), objectType);
    });
  }

  /**
   * Get object type by name
   */
  get(name) {
    return this.types.get(name.toLowerCase());
  }

  /**
   * Check if an object type exists
   */
  has(name) {
    return this.types.has(name.toLowerCase());
  }

  /**
   * Get all object types
   */
  getAll() {
    return Array.from(this.types.values());
  }

  /**
   * Get object types by category
   */
  getByCategory(category) {
    return this.getAll().filter(type => type.isInCategory(category));
  }

  /**
   * Get all valid object type names
   */
  getAllNames() {
    return Array.from(this.types.keys());
  }

  /**
   * Get object type names by category
   */
  getNamesByCategory(category) {
    return this.getByCategory(category).map(type => type.name);
  }
}

/**
 * Transaction Type Registry
 * Separate registry for transaction types used in transaction hub imports
 */
class TransactionTypeRegistry {
  constructor() {
    this.types = new Set([
      'customer', 'order', 'invoice', 'creditmemo', 'product', 'orderproduct', 
      'debitmemo', 'invoiceitem', 'creditmemoitem', 'debitmemoitem'
    ]);
  }

  /**
   * Check if a transaction type is valid
   */
  isValid(transactionType) {
    return this.types.has(transactionType.toLowerCase());
  }

  /**
   * Get all valid transaction types
   */
  getAll() {
    return Array.from(this.types);
  }
}

// Create singleton instances
const objectTypeRegistry = new ObjectTypeRegistry();
const transactionTypeRegistry = new TransactionTypeRegistry();

/**
 * Utility Functions
 */

/**
 * Check if an object type is valid
 */
function isValidObjectType(objectType) {
  return objectTypeRegistry.has(objectType);
}

/**
 * Get object type definition
 */
function getObjectType(objectType) {
  return objectTypeRegistry.get(objectType);
}

/**
 * Get the category of an object type
 */
function getObjectCategory(objectType) {
  const type = getObjectType(objectType);
  return type ? type.category : null;
}

/**
 * Check if an object type is in a specific category
 */
function isProductCatalogObjectType(objectType) {
  const type = getObjectType(objectType);
  return type ? type.isInCategory('product_catalog') : false;
}

function isTransactionObjectType(objectType) {
  const type = getObjectType(objectType);
  return type ? type.isInCategory('transaction') : false;
}

function isTransactionHubObjectType(objectType) {
  const type = getObjectType(objectType);
  return type ? type.isInCategory('transaction_hub') : false;
}

/**
 * Get the API object name for an object type
 */
function getApiObjectName(objectType) {
  const type = getObjectType(objectType);
  return type ? type.apiName : objectType;
}

/**
 * Get the available fields for an object type
 */
function getObjectFields(objectType) {
  const type = getObjectType(objectType);
  return type ? type.getDefaultFields() : ['id', 'name', 'createdDate', 'lastModifiedDate'];
}

/**
 * Get the form field name for an object type
 */
function getFormFieldName(objectType) {
  const type = getObjectType(objectType);
  return type ? type.formFieldName : objectType.toLowerCase();
}

/**
 * Normalize an object type (convert to canonical name)
 */
function normalizeObjectType(objectType) {
  const type = getObjectType(objectType);
  return type ? type.name : objectType;
}

/**
 * Get object types by category
 */
function getObjectTypesByCategory(category) {
  return objectTypeRegistry.getNamesByCategory(category);
}

/**
 * Get a formatted list of valid object types
 */
function getValidObjectTypesList() {
  return objectTypeRegistry.getAllNames().join(', ');
}

/**
 * Check if a transaction type is valid for transaction hub imports
 */
function isValidTransactionType(transactionType) {
  return transactionTypeRegistry.isValid(transactionType);
}

/**
 * Get all valid transaction types
 */
function getValidTransactionTypes() {
  return transactionTypeRegistry.getAll();
}

// Export the registry instances for advanced usage
module.exports = {
  // Classes
  ObjectType,
  ProductCatalogObjectType,
  TransactionObjectType,
  TransactionHubObjectType,
  ObjectTypeRegistry,
  TransactionTypeRegistry,
  
  // Registry instances
  objectTypeRegistry,
  transactionTypeRegistry,
  
  // Utility functions
  isValidObjectType,
  getObjectType,
  getObjectCategory,
  isProductCatalogObjectType,
  isTransactionObjectType,
  isTransactionHubObjectType,
  getApiObjectName,
  getObjectFields,
  getFormFieldName,
  normalizeObjectType,
  getObjectTypesByCategory,
  getValidObjectTypesList,
  isValidTransactionType,
  getValidTransactionTypes,
  
  // Categories (for backward compatibility)
  OBJECT_CATEGORIES: {
    PRODUCT_CATALOG: 'product_catalog',
    TRANSACTION: 'transaction',
    TRANSACTION_HUB: 'transaction_hub'
  }
}; 