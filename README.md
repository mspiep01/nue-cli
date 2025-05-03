# Nue CLI

A command-line interface for interacting with the Nue Self-Service API.

## Installation

### Local Development

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm link` to create a global symlink for the CLI

### Configuration

1. You can set up your API keys easily using the CLI:
   ```bash
   # Set production API key
   nue set-key

   # Set sandbox API key
   nue set-key --sandbox
   ```

2. Alternatively, copy `.env.example` to `.env` and manually add your Nue API keys

## Usage

### Set API Key

You can set your API keys directly through the CLI:

```bash
# Set production API key interactively
nue set-key

# Set sandbox API key interactively
nue set-key --sandbox

# Set production API key directly
nue set-key --key "your-api-key-here"

# Set sandbox API key directly
nue set-key --sandbox --key "your-sandbox-api-key-here"
```

### Create Order

You can create an order by providing a JSON payload either directly or from a file:

```bash
# Create an order using JSON payload
nue create-order --json '{ "customer": { "id": "0011U000007d0AEQAY" }, "effectiveDate": "2025-01-01", "orderProducts": [ { "priceBookEntryId": "01uVA0000080fWPYAY", "subscriptionStartDate": "2025-01-01", "quantity": 1.0, "subscriptionTerm": 12.0 } ] }'

# Create an order using JSON from a file
nue create-order --file ./order-payload.json

# Create an order in sandbox environment
nue create-order --sandbox --file ./order-payload.json

# Create and automatically activate an order
nue create-order --file ./order-payload.json --auto-activate

# Create an order with detailed output
nue create-order --file ./order-payload.json --verbose
```

### Activate Order

You can activate an existing order by providing the order ID:

```bash
# Activate an order
nue activate-order <order-id>

# Activate an order in sandbox environment
nue activate-order <order-id> --sandbox

# Activate an order and generate invoice
nue activate-order <order-id> --generate-invoice

# Activate an order with detailed output
nue activate-order <order-id> --verbose
```

### Query Objects

You can query different object types like subscriptions, customers, and orders:

```bash
# Query all subscriptions
nue query subscriptions

# Query subscriptions by customer ID
nue query subscriptions --customer-id 0011U000007d0AEQAY

# Query subscriptions by name with verbose output
nue query subscriptions --name "Premium Plan" --verbose

# Query orders in sandbox environment
nue query orders --sandbox

# Query customers with pagination
nue query customers --limit 5 --page 2

# Query orders by status
nue query orders --status "Activated"
```

## Commands

### set-key

Sets API keys for the Nue CLI.

Options:
- `--sandbox`: Set API key for sandbox environment (default is production)
- `--key <key>`: Directly provide the API key value (will prompt if not provided)

### create-order

Creates a new order in the Nue platform.

Options:
- `--sandbox`: Use sandbox environment
- `--json <json>`: JSON payload for the order
- `--file <path>`: Path to JSON file containing the order payload
- `--auto-activate`: Automatically activate the order after creation
- `--generate-invoice`: Generate invoice during activation (requires `--auto-activate`)
- `--activate-invoice`: Activate invoice during activation (requires `--auto-activate`)
- `--verbose`: Show detailed output information (default: concise output)

### activate-order

Activates an existing order in the Nue platform.

Arguments:
- `<orderId>`: The ID of the order to activate

Options:
- `--sandbox`: Use sandbox environment
- `--generate-invoice`: Generate invoice during activation
- `--activate-invoice`: Activate invoice during activation
- `--verbose`: Show detailed output information (default: concise output)

### query

Queries objects in the Nue platform.

Arguments:
- `<objectType>`: Type of object to query (subscription/subscriptions, customer/customers, order/orders)

Options:
- `--sandbox`: Use sandbox environment
- `--id <id>`: Filter by ID
- `--name <name>`: Filter by name
- `--status <status>`: Filter by status (e.g., "Active", "Draft", "Activated")
- `--customer-id <customerId>`: Filter by customer ID
- `--limit <number>`: Limit the number of results (default: 10)
- `--page <number>`: Page number for pagination (default: 1)
- `--verbose`: Show detailed output information (default: concise output)

## Development

- `npm start`: Run the CLI locally
- `npm run link`: Create a global symlink for the CLI
- `npm run unlink`: Remove the global symlink