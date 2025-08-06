# Nue CLI

A command-line interface for interacting with the Nue Self-Service API.

## Features

- **Lifecycle Management**: Create and manage orders, subscriptions, customers, and usage data
- **Platform Operations**: Export, import, and query metadata and platform objects
- **Configuration Management**: Easy API key setup for production and sandbox environments
- **Flexible Output Formats**: JSON, CSV, and human-readable output formats
- **Async Operations**: Support for long-running operations with job tracking
- **Environment Support**: Production and sandbox environment support

## Installation

### Prerequisites

- Node.js 16 or higher
- npm or yarn package manager

### Local Development

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd nue-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a global symlink for development:
   ```bash
   npm run link
   ```

## Configuration

### Set API Keys

You can set up your API keys easily using the CLI:

```bash
# Set production API key interactively
nue set-key

# Set sandbox API key interactively
nue set-key --environment sandbox

# Set production API key directly
nue set-key --key "your-api-key-here"

# Set sandbox API key directly
nue set-key --environment sandbox --key "your-sandbox-api-key-here"
```

### Environment Variables

Alternatively, you can set API keys using environment variables:

```bash
# Production
export NUE_API_KEY="your-production-api-key"

# Sandbox
export NUE_SANDBOX_API_KEY="your-sandbox-api-key"
```

## Usage

### Lifecycle Commands

#### Orders

```bash
# Create an order
nue order create --json '{ "customer": { "id": "0011U000007d0AEQAY" }, "effectiveDate": "2025-01-01", "orderProducts": [ { "priceBookEntryId": "01uVA0000080fWPYAY", "subscriptionStartDate": "2025-01-01", "quantity": 1.0, "subscriptionTerm": 12.0 } ] }'

# Create an order from file
nue order create --file ./order-payload.json

# Create and automatically activate an order
nue order create --file ./order-payload.json --auto-activate

# Activate an existing order
nue order activate <order-id>

# Activate an order and generate invoice
nue order activate <order-id> --generate-invoice

# Get order details
nue order get <order-id>

# Get orders with filters
nue order get --customer-id "0011U000007d0AEQAY" --status "Draft"
```

#### Subscriptions

```bash
# Get subscriptions by customer ID (requires customer-id parameter)
nue subscription get --customer-id 0011U000007d0AEQAY

# Get specific subscription
nue subscription get <subscription-id> --include-products

# Alternative: Use legacy query command (works reliably)
nue query subscription --customer-id 0011U000007d0AEQAY
```

#### Customers

```bash
# Create a customer
nue customer create --json '{"name": "Acme Corp", "email": "contact@acme.com"}'

# Get customer details
nue customer get <customer-id> --include-orders
```

#### Usage

```bash
# Upload usage data
nue usage upload --file usage-data.json

# Upload usage with specific format
nue usage upload --file usage-data.csv --format csv
```

### Platform Commands

#### Metadata Operations

```bash
# Export metadata
nue platform export --object-type product --wait

# Export with filters
nue platform export --object-type subscription --customer-id "001xx000003DIloAAG" --wait

# Import metadata
nue platform import --object-type product --file products.jsonl --wait

# Query metadata with GraphQL (requires correct endpoint configuration)
nue platform query --query "{ product { id name status } }"

# Query metadata with variables
nue platform query --query 'query { Order(where: {id: {_eq: "801VA00000MfxE6YAJ"}}) { id orderNumber status } }'query Product($status: String) { product(status: $status) { id name } }" --variables '{"status": "active"}'
```

**Note**: Platform queries require GraphQL syntax, not SOQL. The platform API uses GraphQL for metadata operations. 

**Important**: According to the [Nue API documentation](https://api-docs.nue.io/query-nue-objects-using-graphql):
- Object names should be **lowercase** (e.g., `product`, `subscription`, `order`)
- The correct endpoint should be `/async/graphql` (currently using `/graphql`)
- Use the GraphQL generator in Nue settings to create proper queries
- Different objects may be queried from Salesforce vs. AWS services

### Legacy Commands (Still Supported)

For backward compatibility, the following legacy commands are still available and often more reliable:

```bash
# Legacy order commands
nue create-order --file ./order-payload.json
nue activate-order <order-id>

# Legacy query commands (uses GraphQL)
nue query subscription --customer-id 0011U000007d0AEQAY
nue query order --status "Activated"
nue query usage --subscription-id a48VA000000OifvYAC

# Legacy export/import commands
nue export product --wait
nue import product products.jsonl --wait
```

## Command Reference

### Lifecycle Commands

#### `nue order`
- `create`: Create new orders
- `activate <orderId>`: Activate existing orders
- `get [orderId]`: Get order details

#### `nue subscription`
- `get [subscriptionId]`: Get subscription details

#### `nue customer`
- `create`: Create new customers
- `get <customerId>`: Get customer details

#### `nue usage`
- `upload`: Upload usage data

### Platform Commands

#### `nue platform`
- `export`: Export metadata and objects
- `import`: Import metadata and objects
- `query`: Query metadata and objects

### Configuration Commands


## Development

### Project Structure

```
nue-cli/
├── src/
│   ├── commands/
│   │   ├── lifecycle/          # Lifecycle management commands
│   │   │   ├── orders/         # Order operations
│   │   │   ├── subscriptions/  # Subscription operations
│   │   │   ├── customers/      # Customer operations
│   │   │   └── usage/          # Usage operations
│   │   ├── platform/           # Platform operations
│   │   │   └── metadata/       # Metadata operations
│   │   └── legacy/             # Legacy commands (deprecated)
│   ├── services/               # Business logic and services
│   ├── utils/                  # Utility functions
│   └── index.js                # Main CLI entry point
├── tests/                      # Test suite
├── examples/                   # Usage examples
└── docs/                       # Documentation
```

### Available Scripts

```bash
# Development
npm start              # Run the CLI locally
npm run link          # Create a global symlink for development
npm run unlink        # Remove the global symlink

# Testing
npm test              # Run all tests
npm run test:unit     # Run unit tests
npm run test:integration # Run integration tests
npm run test:e2e      # Run end-to-end tests
```

### Running Tests

The project includes a comprehensive test suite:

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test command interactions and API calls
- **End-to-End Tests**: Test complete CLI workflows
- **Command Test Runner**: Automated testing of command outputs

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

## Contributing

We welcome contributions to the Nue CLI! Please read this section to understand how to contribute effectively.

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/nue-cli.git
   cd nue-cli
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a development branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Development Workflow

1. **Make your changes** following the coding standards below
2. **Write tests** for new functionality
3. **Run the test suite** to ensure everything works:
   ```bash
   npm test
   ```
4. **Test your changes** locally:
   ```bash
   npm run link
   nue --help  # Test that your command appears
   ```
5. **Commit your changes** with a descriptive commit message
6. **Push to your fork** and create a pull request

### Coding Standards

#### Code Style
- Use **2 spaces** for indentation
- Use **single quotes** for strings
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes
- Add **semicolons** at the end of statements
- Keep lines under **100 characters** when possible

#### Command Structure
- Follow the **resource-based pattern** for new commands
- Use **lifecycle commands** for business operations
- Use **platform commands** for metadata operations
- Implement **proper error handling** and user feedback
- Include **comprehensive help text** for all commands

#### Testing Requirements
- **Unit tests** for all new functions and classes
- **Integration tests** for new commands
- **End-to-end tests** for complex workflows
- Maintain **test coverage** above 80%

### Command Development

When adding new commands, follow this structure:

```javascript
// src/commands/lifecycle/your-resource/your-action.js
const { BaseCommand } = require('../../services/commandRegistry');

class YourActionCommand extends BaseCommand {
  constructor() {
    super();
    this.name = 'your-action';
    this.description = 'Description of what this command does';
  }

  register(group) {
    group
      .command(this.name)
      .description(this.description)
      .option('--option-name <value>', 'Option description')
      .action(async (options) => {
        try {
          await this.execute(options);
        } catch (error) {
          this.handleError(error);
        }
      });
  }

  async execute(options) {
    // Your command logic here
  }
}

module.exports = YourActionCommand;
```

### Documentation

When adding new features:

1. **Update the README** with usage examples
2. **Add examples** to the `examples/` directory
3. **Update command help text** with comprehensive descriptions
4. **Document any breaking changes** in the migration guide

### Pull Request Guidelines

1. **Clear title** describing the change
2. **Detailed description** of what was changed and why
3. **Link to any related issues**
4. **Include tests** for new functionality
5. **Update documentation** as needed
6. **Ensure all tests pass** before submitting

### Issue Reporting

When reporting issues:

1. **Use the issue template** if available
2. **Provide clear steps** to reproduce the problem
3. **Include error messages** and stack traces
4. **Specify your environment** (OS, Node.js version, etc.)
5. **Include example commands** that demonstrate the issue

### Release Process

[TODO]

## Troubleshooting

### Common Issues

#### "Unknown command" errors
- Commands are **singular**: use `nue order` not `nue orders`
- Use `nue subscription` not `nue subscriptions`
- Use `nue customer` not `nue customers`

#### API Key Issues
- Ensure your API key is set correctly: `nue set-key`
- Check environment: use `--environment sandbox` for sandbox testing
- Verify API key permissions in the Nue platform

#### GraphQL Query Errors
- Platform queries require **GraphQL syntax**, not SOQL
- Use `nue platform query --query "{ product { id name } }"` (singular object names)
- Not: `nue platform query --query "SELECT Id, Name FROM Product"`



## Examples

See the `examples/` directory for comprehensive usage examples:

- `usage-examples.md`: Basic usage patterns
- `export-examples.md`: Data export examples
- `import-examples.md`: Data import examples


## License

This project is licensed under the ISC License - see the [LICENSE](./LICENSE) file for details.

## Support

- **Documentation**: [API Documentation](https://api-docs.nue.io/)
