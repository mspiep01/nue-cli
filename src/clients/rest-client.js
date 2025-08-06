const axios = require('axios');
const chalk = require('chalk');

class RestClient {
  constructor(platform, options = {}) {
    this.platform = platform;
    this.apiKey = options.apiKey;
    this.baseUrl = this.getBaseUrl(options.sandbox);
    this.timeout = options.timeout || 30000;
  }

  getBaseUrl(sandbox = false) {
    const baseUrls = {
      platform: sandbox ? 'https://api.sandbox.nue.io' : 'https://api.nue.io',
      lifecycle: sandbox ? 'https://api.sandbox.nue.io' : 'https://api.nue.io',
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

  async get(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Debug logging
    if (process.env.NUE_DEBUG) {
      console.log(chalk.gray(`DEBUG: Making GET request to: ${url}`));
      console.log(chalk.gray(`DEBUG: Headers:`, JSON.stringify(this.getHeaders(), null, 2)));
      console.log(chalk.gray(`DEBUG: Params:`, JSON.stringify(options.params || {}, null, 2)));
    }
    
    const config = {
      method: 'GET',
      url,
      headers: this.getHeaders(),
      timeout: this.timeout,
      params: options.params || {},
      paramsSerializer: {
        serialize: (params) => {
          const searchParams = new URLSearchParams();
          Object.keys(params).forEach(key => {
            const value = params[key];
            if (value !== undefined && value !== null) {
              if (Array.isArray(value)) {
                searchParams.append(key, JSON.stringify(value));
              } else {
                searchParams.append(key, value);
              }
            }
          });
          return searchParams.toString();
        }
      },
      ...options
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async post(endpoint, data, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Use provided headers if available, otherwise use default headers
    const headers = options.headers || this.getHeaders();
    
    // Debug logging for POST requests
    if (process.env.NUE_DEBUG || process.env.NUE_VERBOSE) {
      console.log(chalk.gray(`DEBUG: Making POST request to: ${url}`));
      console.log(chalk.gray(`DEBUG: Headers:`, JSON.stringify(headers, null, 2)));
      console.log(chalk.gray(`DEBUG: Request Data:`, JSON.stringify(data, null, 2)));
    }
    
    const config = {
      method: 'POST',
      url,
      headers,
      timeout: this.timeout,
      data,
      ...options
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async patch(endpoint, data, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      method: 'PATCH',
      url,
      headers: this.getHeaders(),
      timeout: this.timeout,
      data,
      ...options
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      method: 'DELETE',
      url,
      headers: this.getHeaders(),
      timeout: this.timeout,
      ...options
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async put(endpoint, data, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      method: 'PUT',
      url,
      headers: this.getHeaders(),
      timeout: this.timeout,
      data,
      ...options
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data, headers } = error.response;
      const message = data?.message || data?.error || 'API request failed';
      
      // For 500 errors, provide more detailed debugging information
      if (status === 500) {
        console.error(chalk.red('=== 500 Server Error Details ==='));
        console.error(chalk.red(`Error ID: ${data?.errorId || 'N/A'}`));
        console.error(chalk.red(`Status: ${status}`));
        console.error(chalk.red(`Message: ${message}`));
        console.error(chalk.red(`Response Headers: ${JSON.stringify(headers, null, 2)}`));
        console.error(chalk.red(`Full Response Data: ${JSON.stringify(data, null, 2)}`));
        console.error(chalk.red('=== End Error Details ==='));
      }
      
      throw new Error(`API Error (${status}): ${message}`);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('No response received from API server');
    } else {
      // Something else happened
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  setSandbox(sandbox) {
    this.baseUrl = this.getBaseUrl(sandbox);
  }

  async downloadFile(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'nue-api-key': this.apiKey
        },
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}

module.exports = RestClient; 