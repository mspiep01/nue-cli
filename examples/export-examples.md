# Nue CLI Export Examples

This document provides examples of how to use the export functionality in the Nue CLI.

## Basic Export Commands

### Export Products with Default Fields

```bash
# Export all products
nue platform export --object-type product --wait

# Export products with specific filters
nue platform export --object-type product --filters '{"name": "Usage Product", "active": true}' --wait

# Export products created in the last 30 days
nue platform export --object-type product --filters '{"createdDate": {"_gte": "30 days ago"}}' --wait
```

### Export UOM (Units of Measure)

```bash
# Export all UOM records
nue platform export --object-type uom --wait

# Export only active UOM records
nue platform export --object-type uom --filters '{"active": true}' --wait

# Export UOM with specific name
nue platform export --object-type uom --filters '{"name": "Each"}' --wait
```

### Export Subscriptions

```bash
# Export all subscriptions
nue platform export --object-type subscription --wait

# Export subscriptions for a specific customer
nue platform export --object-type subscription --filters '{"customerId": "001xx000003DIloAAG"}' --wait

# Export active subscriptions
nue platform export --object-type subscription --filters '{"status": "Active"}' --wait
```

### Export Usage Data

```bash
# Export all usage records
nue platform export --object-type usage --wait

# Export usage for a specific subscription
nue platform export --object-type usage --filters '{"subscriptionId": "a0xx0000000XxXxAAV"}' --wait

# Export usage from the last 7 days
nue platform export --object-type usage --filters '{"createdDate": {"_gte": "7 days ago"}}' --wait
```

## Advanced Export Options

### Using Custom GraphQL Queries

```bash
# Export with custom query file
nue platform export --object-type product --query-file ./queries/product-export.graphql --wait

# Export with inline query
nue platform export --object-type product --query 'query { Product(where: {name: {_like: "Usage%"}}) { id name sku status } }' --wait
```

### Export with Variables

```bash
# Export with variables file
nue platform export --object-type product --query-file ./queries/product-export.graphql --variables-file ./variables.json --wait

# Export with inline variables
nue platform export --object-type product --query 'query($status: String!) { Product(where: {status: {_eq: $status}}) { id name sku } }' --variables '{"status": "Active"}' --wait
```

### Output Format Options

```bash
# Export to JSON format (default)
nue platform export --object-type product --format json --output products.json --wait

# Export to JSONL format
nue platform export --object-type product --format jsonl --output products.jsonl --wait

# Export to CSV format
nue platform export --object-type product --format csv --output products.csv --wait
```

### Async vs Sync Export

```bash
# Async export (default) - returns job ID immediately
nue platform export --object-type product

# Sync export - waits for completion
nue platform export --object-type product --wait

# Sync export with custom timeout
nue platform export --object-type product --wait --timeout 600
```

## Filter Examples

### Date Filters

```bash
# Export records created after a specific date
nue platform export --object-type product --filters '{"createdDate": {"_gte": "2024-01-01"}}' --wait

# Export records created before a specific date
nue platform export --object-type product --filters '{"createdDate": {"_lte": "2024-12-31"}}' --wait

# Export records from the last month
nue platform export --object-type product --filters '{"createdDate": {"_gte": "1 month ago"}}' --wait

# Export records from a specific quarter
nue platform export --object-type product --filters '{"createdDate": {"_gte": "3 months ago", "_lte": "1 month ago"}}' --wait
```

### Status and Active Filters

```bash
# Export only active records
nue platform export --object-type product --filters '{"active": true}' --wait

# Export only inactive records
nue platform export --object-type product --filters '{"active": false}' --wait

# Export by specific status
nue platform export --object-type product --filters '{"status": "Draft"}' --wait
```

### ID-based Filters

```bash
# Export by specific ID
nue platform export --object-type product --filters '{"id": "a0xx0000000XxXxAAV"}' --wait

# Export by SKU
nue platform export --object-type product --filters '{"sku": "USAGE-001"}' --wait

# Export by customer ID
nue platform export --object-type subscription --filters '{"customerId": "001xx000003DIloAAG"}' --wait
```

## Example GraphQL Query Files

### products-export.graphql
```graphql
query {
  Product(
    where: {
      _or: [
        {name: {_like: "Usage%"}},
        {createdDate: {_gte: "2024-01-01T00:00:00Z"}}
      ]
    }
  ) {
    id
    name
    sku
    description
    status
    active
    autoRenew
    billingPeriod
    billingTiming
    configurable
    createdDate
    lastModifiedDate
    priceBookId
    priceModel
    productCategory
    recordType
    referenceProductId
    showIncludedProductOptions
    soldIndependently
    startDate
    endDate
    freeTrialType
    freeTrialUnit
    imageUrl
    defaultRenewalTerm
    defaultSubscriptionTerm
    defaultUomId
    creditConversionId
    creditPoolId
    externalId
    evergreen
    bundleTemplate
    carvesEligible
    carvesLiabilitySegment
    carvesRevenueSegment
    contractLiabilitySegment
    contractRevenueSegment
    lastPublishedById
    lastPublishedDate
    publishStatus
    productCode
    taxCategory
    taxCode
    taxMode
    revenueRuleExternalId
  }
}
```

### uom-export.graphql
```graphql
query {
  UOM(where: {name: {_eq: "Each"}}) {
    active
    createdById
    createdDate
    decimalScale
    externalId
    id
    lastModifiedById
    lastModifiedDate
    name
    quantityDimension
    roundingMode
    termDimension
    unitCode
  }
}
```

### usage-export.graphql
```graphql
query {
  Usage(
    where: {
      _and: [
        {startTime: {_lte: "2024-07-31T23:59:59-07:00"}},
        {startTime: {_gte: "2024-07-01T00:00:00-07:00"}},
        {customer: {id: {_eq: "001rr00000jcgicyar"}}},
        {isCash: {_eq: true}},
        {currencyIsoCode: {_eq: "USD"}}
      ]
    },
    orderBy: {startTime: DESC}
  ) {
    customer {
      name
    }
    id
    name
    subscriptionNumber
    product {
      name
      sku
    }
    status
    startTime
    endTime
    quantity
    termedTotalQuantity
    ratedAmount
    termStartDate
    termEndDate
    orderNumber
    orderProductNumber
    createdDate
    lastModifiedDate
    subscriptionId
    zoneId
    windowSize
    ratableTime
    ratedTime
    orderProductId
    properties
    errorCode
    errorMessage
    invoiceId
    invoiceItemId
    invoiceItemNumber
    invoiceNumber
    creditsApplied
    invoiceItemDetailId
    invoiceItemDetailNumber
    isCash
    salesAccount {
      name
    }
  }
}
```

## Error Handling

### Common Error Scenarios

```bash
# Invalid object type
nue platform export --object-type invalid-type
# Error: Invalid object type 'invalid-type'. Valid types are: product, products, uom, ...

# Missing API key
nue platform export --object-type product
# Error: Unable to proceed without API key

# Invalid date format
nue platform export --object-type product --filters '{"createdDate": {"_gte": "invalid-date"}}'
# Error: Invalid date format. Use ISO format or relative like "1 day ago"

# Timeout error
nue platform export --object-type product --wait --timeout 1
# Error: Export job timed out after 1 seconds
```

### Verbose Output

```bash
# Get detailed information about the export process
nue platform export --object-type product --verbose --wait
```

This will show:
- GraphQL query being executed
- Variables being used
- Detailed error information
- Export job status updates 