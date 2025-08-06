# Usage Query Examples

This document provides examples of how to use the `nue query usage` command with various filters and output formats.

## Basic Usage Queries

### Query all usage records
```bash
nue query usage
```

### Query usage with verbose output
```bash
nue query usage --verbose
```

### Query usage in sandbox environment
```bash
nue query usage --sandbox
```

## Filtering by Account

### Query usage by sales account name
```bash
nue query usage --account "Happy Gilmore"
```

### Query usage by account in sandbox
```bash
nue query usage --sandbox --account "Test Account"
```

## Filtering by IDs

### Query usage by subscription ID (Salesforce ID format)
```bash
nue query usage --subscription-id a48VA000000OifvYAC
```

### Query usage by customer ID (Salesforce ID format)
```bash
nue query usage --customer-id 001TQ00000JVMFpYAP
```

### Query usage by usage ID (UUID format)
```bash
nue query usage --usage-id 30659cc4-b716-4ebb-8d1e-e0be0250795f
```

## Filtering by Timestamp

### Query usage from 1 day ago
```bash
nue query usage --timestamp "1 day ago"
```

### Query usage from 2 days ago
```bash
nue query usage --timestamp "2 days ago"
```

### Query usage from 1 week ago
```bash
nue query usage --timestamp "7 days ago"
```

### Query usage from 1 month ago
```bash
nue query usage --timestamp "1 month ago"
```

### Query usage from 3 months ago
```bash
nue query usage --timestamp "3 months ago"
```

### Query usage from 1 quarter ago
```bash
nue query usage --timestamp "1 quarter ago"
```

### Query usage from 1 year ago
```bash
nue query usage --timestamp "1 year ago"
```

### Query usage from 2 years ago
```bash
nue query usage --timestamp "2 years ago"
```

## Future Timestamp Filters

### Query usage from 1 day from now
```bash
nue query usage --timestamp "1 day from now"
```

### Query usage from 1 month from now
```bash
nue query usage --timestamp "1 month from now"
```

### Query usage from 1 year from now
```bash
nue query usage --timestamp "1 year from now"
```

## Output Formats

### Output as JSON
```bash
nue query usage --account "Happy Gilmore" --output json
```

### Output as CSV
```bash
nue query usage --account "Happy Gilmore" --output csv
```

### Output as pretty table (default)
```bash
nue query usage --account "Happy Gilmore" --output pretty
```

## Combined Filters

### Query usage by account and subscription ID
```bash
nue query usage --account "Happy Gilmore" --subscription-id a48VA000000OifvYAC
```

### Query usage by account and timestamp
```bash
nue query usage --account "Happy Gilmore" --timestamp "1 month ago"
```

### Query usage by customer ID and timestamp
```bash
nue query usage --customer-id 001TQ00000JVMFpYAP --timestamp "1 week ago"
```

### Query usage by subscription ID and output as JSON
```bash
nue query usage --subscription-id a48VA000000OifvYAC --output json
```

### Query usage by account, timestamp, and output as CSV
```bash
nue query usage --account "Happy Gilmore" --timestamp "1 month ago" --output csv
```

## Error Handling Examples

### Invalid UUID format
```bash
nue query usage --usage-id invalid-uuid
# Error: Invalid usage ID format. Must be a valid UUID.
```

### Invalid Salesforce ID format
```bash
nue query usage --subscription-id invalid-id
# Error: Invalid subscription ID format. Must be a valid Salesforce ID.
```

### Invalid timestamp format
```bash
nue query usage --timestamp "invalid format"
# Error: Invalid timestamp filter: Invalid timestamp format. Use format like "1 day ago" or "2 days from now"
```

### Invalid time unit
```bash
nue query usage --timestamp "1 invalid ago"
# Error: Invalid timestamp filter: Invalid time unit. Use day(s), month(s), quarter(s), or year(s)
```

## Expected Output Formats

### Pretty Table Output (Default)
```
Usage query successful!

Found 25 usage:

ID         | Name            | Usage ID        | Customer ID     | Quantity | Timestamp
-----------|-----------------|-----------------|-----------------|----------|--------------------
dde81db8-e2| RU-000000000007| 30659cc4-b716-4e| 001TQ00000JVMFp| 30000.0  | 2024-10-31T09:00:06Z
5a1f9662-a2| RU-000000000011| 0ec5150f-d1d5-4| 001TQ00000JVMFp| 2385.0   | 2025-04-05T00:00:00Z
...
```

### JSON Output
```json
[
  {
    "createdDate": "2025-03-28T23:05:14.469Z",
    "customerId": "001TQ00000JVMFpYAP",
    "id": "dde81db8-e2a0-47e7-9f2d-fd3940080ef4",
    "lastModifiedDate": "2025-03-28T23:05:14.469Z",
    "properties": "{\"marketplaceOrderId\": \"3921\"}",
    "quantity": 30000.0,
    "name": "RU-000000000007",
    "salesAccountId": "001TQ00000JVMFpYAP",
    "subscriptionId": "a48VA000000OifvYAC",
    "timestamp": "2024-10-31T09:00:06Z",
    "transactionId": "USAGE-250328190514",
    "usageId": "30659cc4-b716-4ebb-8d1e-e0be0250795f"
  }
]
```

### CSV Output
```csv
ID,Name,Usage ID,Customer ID,Subscription ID,Quantity,Timestamp,Created Date,Last Modified Date,Transaction ID,Properties
"dde81db8-e2a0-47e7-9f2d-fd3940080ef4","RU-000000000007","30659cc4-b716-4ebb-8d1e-e0be0250795f","001TQ00000JVMFpYAP","a48VA000000OifvYAC",30000.0,"2024-10-31T09:00:06Z","2025-03-28T23:05:14.469Z","2025-03-28T23:05:14.469Z","USAGE-250328190514","{\"marketplaceOrderId\": \"3921\"}"
```

## GraphQL Query Structure

The usage command generates GraphQL queries like this:

```graphql
query {
  RawUsage(where: {
    salesAccount: {name: {_eq: "Happy Gilmore"}},
    timestamp: {_lt: "2025-08-03T04:08:30.275Z"}
  }) {
    createdDate
    customerId
    id
    lastModifiedDate
    properties
    quantity
    name
    salesAccountId
    subscriptionId
    timestamp
    transactionId
    usageId
  }
}
```

## Data Fields

The usage query returns the following fields:

- **id**: Unique identifier for the usage record
- **name**: Usage record name (e.g., "RU-000000000007")
- **usageId**: UUID identifier for the usage
- **customerId**: Salesforce customer ID
- **subscriptionId**: Salesforce subscription ID
- **salesAccountId**: Salesforce sales account ID
- **quantity**: Usage quantity (numeric value)
- **timestamp**: When the usage occurred
- **createdDate**: When the usage record was created
- **lastModifiedDate**: When the usage record was last modified
- **transactionId**: Transaction identifier
- **properties**: JSON string containing additional properties 