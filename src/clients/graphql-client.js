const axios = require('axios');

class GraphQLClient {
  constructor(platform, options = {}) {
    this.platform = platform;
    this.apiKey = options.apiKey;
    this.endpoint = `${this.getBaseUrl(options.sandbox)}/async/graphql`;
    this.timeout = options.timeout || 30000;
  }

  getBaseUrl(sandbox = false) {
    const baseUrls = {
      platform: sandbox ? 'https://api.sandbox.nue.io' : 'https://api.nue.io',
      lifecycle: sandbox ? 'https://api.sandbox.nue.io/lifecycle' : 'https://api.nue.io/lifecycle',
      billing: sandbox ? 'https://api.sandbox.nue.io/billing' : 'https://api.nue.io/billing',
      integrations: sandbox ? 'https://api.sandbox.nue.io/integrations' : 'https://api.nue.io/integrations'
    };
    return baseUrls[this.platform] || baseUrls.platform;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['nue-api-key'] = this.apiKey;
    }

    return headers;
  }

  async query(query, variables = {}, options = {}) {
    const payload = {
      query,
      variables,
      operationName: options.operationName
    };

    const config = {
      method: 'POST',
      url: this.endpoint,
      headers: this.getHeaders(),
      timeout: this.timeout,
      data: payload,
      ...options
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async mutation(mutation, variables = {}, options = {}) {
    const payload = {
      query: mutation,
      variables,
      operationName: options.operationName
    };

    const config = {
      method: 'POST',
      url: this.endpoint,
      headers: this.getHeaders(),
      timeout: this.timeout,
      data: payload,
      ...options
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async subscription(query, variables = {}, options = {}) {
    // For subscriptions, we might need WebSocket support
    // For now, we'll use polling as a fallback
    throw new Error('Subscriptions not yet implemented. Use polling with query() instead.');
  }

  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle GraphQL errors
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessages = data.errors.map(err => err.message).join('; ');
        throw new Error(`GraphQL Error: ${errorMessages}`);
      }
      
      // Handle HTTP errors
      const message = data?.message || data?.error || 'GraphQL request failed';
      throw new Error(`GraphQL API Error (${status}): ${message}`);
    } else if (error.request) {
      throw new Error('No response received from GraphQL server');
    } else {
      throw new Error(`GraphQL request failed: ${error.message}`);
    }
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  setSandbox(sandbox) {
    this.endpoint = `${this.getBaseUrl(sandbox)}/graphql`;
  }

  // Helper method for common metadata queries
  async queryMetadata(objectType, fields = ['id', 'name'], filters = {}) {
    const query = `
      query GetMetadata($objectType: String!, $filters: JSON) {
        metadata(objectType: $objectType, filters: $filters) {
          ${fields.join('\n          ')}
        }
      }
    `;

    return await this.query(query, { objectType, filters });
  }

  // Helper method for schema introspection
  async introspectSchema() {
    const query = `
      query IntrospectionQuery {
        __schema {
          types {
            name
            description
            fields {
              name
              description
              type {
                name
              }
            }
          }
        }
      }
    `;

    return await this.query(query);
  }
}

module.exports = GraphQLClient; 