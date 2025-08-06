class PlatformManager {
  constructor(client) {
    this.client = client;
  }

  // Metadata operations
  async exportMetadata(objectType, options = {}) {
    // Use the CPQ async export endpoint like the old CLI
    const payload = {
      query: this.buildDefaultQuery(objectType),
      variables: options.filters || {}
    };
    
    return await this.client.post('/cpq/async/exports', payload);
  }

  async exportAllMetadata(options = {}) {
    // Use the CPQ async export endpoint for all metadata
    const payload = {
      query: this.buildDefaultQuery('all'),
      variables: options.filters || {}
    };
    
    return await this.client.post('/cpq/async/exports', payload);
  }

  buildDefaultQuery(objectType) {
    // Build a basic GraphQL query for the object type
    // This is a simplified version - the old CLI has more sophisticated query building
    const query = `
      query Export${objectType.charAt(0).toUpperCase() + objectType.slice(1)}($limit: Int, $offset: Int) {
        ${objectType}(limit: $limit, offset: $offset) {
          id
          name
          # Add more fields based on object type
        }
      }
    `;
    
    return query;
  }

  async importMetadata(objectType, data, options = {}) {
    const endpoint = `/metadata/${objectType}/import`;
    const payload = {
      data,
      validateOnly: options.validateOnly || false,
      dryRun: options.dryRun || false,
      overwrite: options.overwrite || false,
      includeSchema: options.includeSchema || false
    };
    
    return await this.client.post(endpoint, payload);
  }

  async queryMetadata(query, options = {}) {
    if (this.client.query) {
      // GraphQL client
      return await this.client.query(query, options.variables || {});
    } else {
      // REST client - convert to REST endpoint
      const endpoint = '/metadata/query';
      const payload = {
        query,
        variables: options.variables || {},
        operationName: options.operationName
      };
      
      return await this.client.post(endpoint, payload);
    }
  }

  // Object operations
  async createObject(type, data, options = {}) {
    const endpoint = `/objects/${type}`;
    const payload = {
      ...data,
      validateOnly: options.validateOnly || false
    };
    
    return await this.client.post(endpoint, payload);
  }

  async getObject(type, id, options = {}) {
    const endpoint = id ? `/objects/${type}/${id}` : `/objects/${type}`;
    const params = {
      includeMetadata: options.includeMetadata || false,
      includeSchema: options.includeSchema || false,
      ...options.filters
    };
    
    return await this.client.get(endpoint, { params });
  }

  async updateObject(type, id, data, options = {}) {
    const endpoint = `/objects/${type}/${id}`;
    const payload = {
      ...data,
      validateOnly: options.validateOnly || false
    };
    
    return await this.client.patch(endpoint, payload);
  }

  async deleteObject(type, id, options = {}) {
    const endpoint = `/objects/${type}/${id}`;
    const params = {
      force: options.force || false
    };
    
    return await this.client.delete(endpoint, { params });
  }

  // Settings operations (like credit settings)
  async getSettings(type, options = {}) {
    const endpoint = `/settings/${type}`;
    const params = {
      includeMetadata: options.includeMetadata || false,
      includeSchema: options.includeSchema || false
    };
    
    return await this.client.get(endpoint, { params });
  }

  async updateSettings(type, data, options = {}) {
    const endpoint = `/settings/${type}`;
    const payload = {
      ...data,
      validateOnly: options.validateOnly || false
    };
    
    return await this.client.patch(endpoint, payload);
  }

  async exportSettings(type, options = {}) {
    const endpoint = `/settings/${type}/export`;
    const params = {
      format: options.format || 'json',
      includeMetadata: options.includeMetadata || false,
      includeSchema: options.includeSchema || false
    };
    
    return await this.client.get(endpoint, { params });
  }

  // Schema operations
  async getSchema(objectType, options = {}) {
    const endpoint = `/schema/${objectType}`;
    const params = {
      includeMetadata: options.includeMetadata || false,
      version: options.version
    };
    
    return await this.client.get(endpoint, { params });
  }

  async updateSchema(objectType, schema, options = {}) {
    const endpoint = `/schema/${objectType}`;
    const payload = {
      schema,
      validateOnly: options.validateOnly || false,
      version: options.version
    };
    
    return await this.client.put(endpoint, payload);
  }

  // Validation operations
  async validateObject(type, data, options = {}) {
    const endpoint = `/validation/${type}`;
    const payload = {
      data,
      strict: options.strict || false,
      includeWarnings: options.includeWarnings || true
    };
    
    return await this.client.post(endpoint, payload);
  }

  async validateSchema(objectType, schema, options = {}) {
    const endpoint = `/validation/schema/${objectType}`;
    const payload = {
      schema,
      strict: options.strict || false,
      includeWarnings: options.includeWarnings || true
    };
    
    return await this.client.post(endpoint, payload);
  }

  // Bulk operations
  async bulkCreateObjects(type, objects, options = {}) {
    const endpoint = `/objects/${type}/bulk`;
    const payload = {
      objects,
      validateOnly: options.validateOnly || false,
      continueOnError: options.continueOnError || false
    };
    
    return await this.client.post(endpoint, payload);
  }

  async bulkUpdateObjects(type, objects, options = {}) {
    const endpoint = `/objects/${type}/bulk`;
    const payload = {
      objects,
      validateOnly: options.validateOnly || false,
      continueOnError: options.continueOnError || false
    };
    
    return await this.client.patch(endpoint, payload);
  }

  async bulkDeleteObjects(type, ids, options = {}) {
    const endpoint = `/objects/${type}/bulk`;
    const payload = {
      ids,
      force: options.force || false,
      continueOnError: options.continueOnError || false
    };
    
    return await this.client.delete(endpoint, { data: payload });
  }
}

module.exports = { PlatformManager }; 