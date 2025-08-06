class MetadataValidator {
  static validate(data) {
    if (!data) {
      throw new Error('Metadata data is required');
    }

    if (typeof data !== 'object') {
      throw new Error('Metadata data must be an object');
    }

    // Validate required fields for metadata
    if (data.objectType && typeof data.objectType !== 'string') {
      throw new Error('objectType must be a string');
    }

    if (data.objects && !Array.isArray(data.objects)) {
      throw new Error('objects must be an array');
    }

    if (data.schema && typeof data.schema !== 'object') {
      throw new Error('schema must be an object');
    }

    return true;
  }

  static validateMetadataObject(obj) {
    if (!obj.id && !obj.name) {
      throw new Error('Metadata object must have either id or name');
    }

    if (obj.fields && !Array.isArray(obj.fields)) {
      throw new Error('fields must be an array');
    }

    return true;
  }
}

class ObjectValidator {
  static validate(type, data) {
    if (!data) {
      throw new Error('Object data is required');
    }

    if (typeof data !== 'object') {
      throw new Error('Object data must be an object');
    }

    // Type-specific validation
    switch (type) {
      case 'customer':
        return this.validateCustomer(data);
      case 'order':
        return this.validateOrder(data);
      case 'subscription':
        return this.validateSubscription(data);
      case 'product':
        return this.validateProduct(data);
      default:
        return this.validateGenericObject(data);
    }
  }

  static validateCustomer(data) {
    if (!data.name && !data.email) {
      throw new Error('Customer must have either name or email');
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    return true;
  }

  static validateOrder(data) {
    if (!data.customer && !data.customerId) {
      throw new Error('Order must have customer or customerId');
    }

    if (!data.orderProducts || !Array.isArray(data.orderProducts) || data.orderProducts.length === 0) {
      throw new Error('Order must have at least one order product');
    }

    // Validate each order product
    data.orderProducts.forEach((product, index) => {
      if (!product.priceBookEntryId) {
        throw new Error(`Order product ${index + 1} must have priceBookEntryId`);
      }
      if (product.quantity === undefined || product.quantity === null) {
        throw new Error(`Order product ${index + 1} must have quantity`);
      }
      if (typeof product.quantity !== 'number' || product.quantity <= 0) {
        throw new Error(`Order product ${index + 1} quantity must be a positive number`);
      }
      if (product.subscriptionTerm !== undefined && (typeof product.subscriptionTerm !== 'number' || product.subscriptionTerm <= 0)) {
        throw new Error(`Order product ${index + 1} subscriptionTerm must be a positive number`);
      }
    });

    if (data.effectiveDate && !this.isValidDate(data.effectiveDate)) {
      throw new Error('Invalid effective date format');
    }

    return true;
  }

  static validateSubscription(data) {
    if (!data.customer && !data.customerId) {
      throw new Error('Subscription must have customer or customerId');
    }

    if (!data.subscriptionProducts || !Array.isArray(data.subscriptionProducts) || data.subscriptionProducts.length === 0) {
      throw new Error('Subscription must have at least one subscription product');
    }

    return true;
  }

  static validateProduct(data) {
    if (!data.name && !data.sku) {
      throw new Error('Product must have either name or sku');
    }

    if (data.price && typeof data.price !== 'number') {
      throw new Error('Product price must be a number');
    }

    return true;
  }

  static validateGenericObject(data) {
    if (!data.id && !data.name) {
      throw new Error('Object must have either id or name');
    }

    return true;
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidDate(date) {
    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj);
  }
}

class SettingsValidator {
  static validate(type, data) {
    if (!data) {
      throw new Error('Settings data is required');
    }

    if (typeof data !== 'object') {
      throw new Error('Settings data must be an object');
    }

    // Type-specific validation
    switch (type) {
      case 'credit-tenant-settings':
        return this.validateCreditSettings(data);
      case 'billing-settings':
        return this.validateBillingSettings(data);
      case 'integration-settings':
        return this.validateIntegrationSettings(data);
      default:
        return this.validateGenericSettings(data);
    }
  }

  static validateCreditSettings(data) {
    if (data.maxCredit && typeof data.maxCredit !== 'number') {
      throw new Error('maxCredit must be a number');
    }

    if (data.maxCredit && data.maxCredit < 0) {
      throw new Error('maxCredit cannot be negative');
    }

    if (data.creditTerms && typeof data.creditTerms !== 'number') {
      throw new Error('creditTerms must be a number');
    }

    return true;
  }

  static validateBillingSettings(data) {
    if (data.defaultCurrency && typeof data.defaultCurrency !== 'string') {
      throw new Error('defaultCurrency must be a string');
    }

    if (data.paymentTerms && typeof data.paymentTerms !== 'number') {
      throw new Error('paymentTerms must be a number');
    }

    return true;
  }

  static validateIntegrationSettings(data) {
    if (data.provider && typeof data.provider !== 'string') {
      throw new Error('provider must be a string');
    }

    if (data.webhookUrl && !this.isValidUrl(data.webhookUrl)) {
      throw new Error('Invalid webhook URL format');
    }

    return true;
  }

  static validateGenericSettings(data) {
    // Generic settings validation - just ensure it's an object
    return true;
  }

  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

class QueryValidator {
  static validate(query) {
    if (!query) {
      throw new Error('Query is required');
    }

    if (typeof query !== 'string') {
      throw new Error('Query must be a string');
    }

    if (query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    return true;
  }

  static validateGraphQLQuery(query) {
    this.validate(query);

    // Basic GraphQL query validation
    if (!query.includes('query') && !query.includes('mutation') && !query.includes('subscription')) {
      throw new Error('Query must be a valid GraphQL query, mutation, or subscription');
    }

    return true;
  }
}

module.exports = {
  MetadataValidator,
  ObjectValidator,
  SettingsValidator,
  QueryValidator
}; 