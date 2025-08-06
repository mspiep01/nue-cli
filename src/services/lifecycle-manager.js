class LifecycleManager {
  constructor(client) {
    this.client = client;
  }

  // Customer operations
  async createCustomer(data, options = {}) {
    const endpoint = '/customers';
    const payload = {
      ...data,
      validateOnly: options.validateOnly || false
    };
    
    return await this.client.post(endpoint, payload);
  }

  async getCustomer(id, options = {}) {
    const endpoint = id ? `/customers/${id}` : '/customers';
    const params = {
      includeOrders: options.includeOrders || false,
      includeSubscriptions: options.includeSubscriptions || false,
      ...options.filters
    };
    
    return await this.client.get(endpoint, { params });
  }

  async updateCustomer(id, data, options = {}) {
    const endpoint = `/customers/${id}`;
    const payload = {
      ...data,
      validateOnly: options.validateOnly || false
    };
    
    return await this.client.patch(endpoint, payload);
  }

  async deleteCustomer(id, options = {}) {
    const endpoint = `/customers/${id}`;
    const params = {
      force: options.force || false
    };
    
    return await this.client.delete(endpoint, { params });
  }

  // Order operations
  async createOrder(data, options = {}) {
    const endpoint = '/orders';
    // Only send the order data, don't include options in the payload
    const payload = { ...data };
    
    return await this.client.post(endpoint, payload);
  }

  async getOrder(id, options = {}) {
    const endpoint = id ? `/v1/orders/${id}` : '/v1/orders';
    const params = {
      includeCustomer: options.includeCustomer || false,
      includeProducts: options.includeProducts || false,
      includeInvoice: options.includeInvoice || false,
      ...options.filters
    };
    
    return await this.client.get(endpoint, { params });
  }

  async activateOrder(id, data = {}) {
    const endpoint = `/orders/${id}`;
    const payload = {
      options: data.options || {}
    };
    
    // Only include paymentMethodObject if it's provided and not empty
    if (data.paymentMethodObject && Object.keys(data.paymentMethodObject).length > 0) {
      payload.paymentMethodObject = data.paymentMethodObject;
    }
    
    return await this.client.post(endpoint, payload);
  }

  async cancelOrder(id, options = {}) {
    const endpoint = `/v1/orders/${id}/cancel`;
    const payload = {
      reason: options.reason,
      effectiveDate: options.effectiveDate
    };
    
    return await this.client.post(endpoint, payload);
  }

  // Change order operations
  async createChangeOrder(data, options = {}) {
    const endpoint = '/change-orders';
    const payload = {
      ...data,
      validateOnly: options.validateOnly || false
    };
    
    return await this.client.post(endpoint, payload);
  }

  async getChangeOrder(id, options = {}) {
    const endpoint = id ? `/change-orders/${id}` : '/change-orders';
    const params = {
      includeOriginalOrder: options.includeOriginalOrder || false,
      includeChanges: options.includeChanges || false,
      ...options.filters
    };
    
    return await this.client.get(endpoint, { params });
  }

  async activateChangeOrder(id, options = {}) {
    const endpoint = `/change-orders/${id}/activate`;
    const payload = {
      effectiveDate: options.effectiveDate,
      generateInvoice: options.generateInvoice || false,
      activateInvoice: options.activateInvoice || false
    };
    
    return await this.client.post(endpoint, payload);
  }

  async cancelChangeOrder(id, options = {}) {
    const endpoint = `/change-orders/${id}/cancel`;
    const payload = {
      reason: options.reason
    };
    
    return await this.client.post(endpoint, payload);
  }

  // Subscription operations
  async getSubscriptions(options = {}) {
    const endpoint = '/subscriptions';
    const params = {
      customerIds: options.customerId ? [options.customerId] : undefined,
      status: options.status,
      version: options.version || 'snapshot',
      includeCustomer: options.includeCustomer || false,
      includeProducts: options.includeProducts || false,
      ...options.filters
    };
    
    return await this.client.get(endpoint, { params });
  }

  async getSubscription(id, options = {}) {
    const endpoint = `/subscriptions/${id}`;
    const params = {
      includeCustomer: options.includeCustomer || false,
      includeProducts: options.includeProducts || false,
      includeUsage: options.includeUsage || false
    };
    
    return await this.client.get(endpoint, { params });
  }

  async changeSubscription(id, data, options = {}) {
    const endpoint = `/subscriptions/${id}/change`;
    const payload = {
      ...data,
      effectiveDate: options.effectiveDate,
      validateOnly: options.validateOnly || false
    };
    
    return await this.client.post(endpoint, payload);
  }

  async cancelSubscription(id, options = {}) {
    const endpoint = `/subscriptions/${id}/cancel`;
    const payload = {
      reason: options.reason,
      effectiveDate: options.effectiveDate
    };
    
    return await this.client.post(endpoint, payload);
  }

  async renewSubscription(id, options = {}) {
    const endpoint = `/subscriptions/${id}/renew`;
    const payload = {
      effectiveDate: options.effectiveDate,
      autoRenew: options.autoRenew || false
    };
    
    return await this.client.post(endpoint, payload);
  }

  // Usage operations
  async uploadUsage(data, options = {}) {
    const endpoint = '/usage/raw-usage';
    const payload = {
      ...data,
      validateOnly: options.validateOnly || false
    };
    
    return await this.client.post(endpoint, payload);
  }

  async getUsage(subscriptionId, options = {}) {
    const endpoint = `/usage/${subscriptionId}`;
    const params = {
      startDate: options.startDate,
      endDate: options.endDate,
      granularity: options.granularity || 'daily'
    };
    
    return await this.client.get(endpoint, { params });
  }

  // Bulk operations
  async bulkCreateCustomers(customers, options = {}) {
    const endpoint = '/customers/bulk';
    const payload = {
      customers,
      validateOnly: options.validateOnly || false,
      continueOnError: options.continueOnError || false
    };
    
    return await this.client.post(endpoint, payload);
  }

  async bulkCreateOrders(orders, options = {}) {
    const endpoint = '/v1/orders/bulk';
    const payload = {
      orders,
      validateOnly: options.validateOnly || false,
      continueOnError: options.continueOnError || false,
      autoActivate: options.autoActivate || false
    };
    
    return await this.client.post(endpoint, payload);
  }

  // Search and filtering
  async searchCustomers(query, options = {}) {
    const endpoint = '/customers/search';
    const params = {
      q: query,
      limit: options.limit || 50,
      offset: options.offset || 0,
      ...options.filters
    };
    
    return await this.client.get(endpoint, { params });
  }

  async searchOrders(query, options = {}) {
    const endpoint = '/v1/orders/search';
    const params = {
      q: query,
      limit: options.limit || 50,
      offset: options.offset || 0,
      ...options.filters
    };
    
    return await this.client.get(endpoint, { params });
  }
}

module.exports = { LifecycleManager }; 