const RestClient = require('./rest-client');
const GraphQLClient = require('./graphql-client');
const JobClient = require('./job-client');

class ApiClientFactory {
  static createClient(platform, protocol = 'rest', options = {}) {
    switch (protocol) {
      case 'rest':
        return new RestClient(platform, options);
      case 'graphql':
        return new GraphQLClient(platform, options);
      case 'job':
        return new JobClient(platform, options);
      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  static getSupportedProtocols() {
    return ['rest', 'graphql', 'job'];
  }

  static getSupportedPlatforms() {
    return ['platform', 'lifecycle', 'billing', 'integrations'];
  }
}

module.exports = { ApiClientFactory }; 