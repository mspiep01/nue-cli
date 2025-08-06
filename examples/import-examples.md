# Nue CLI Import Examples

This document provides examples of how to use the import functionality in the Nue CLI.

## Basic Import Commands

### Import Product Catalog Data

```bash
# Import products from JSON file
nue platform import --object-type product --file products.json --wait

# Import products from CSV file
nue platform import --object-type product --file products.csv --format csv --wait

# Import products from JSONL file
nue platform import --object-type product --file products.jsonl --format jsonl --wait
```

### Import from Export Job ID

```bash
# Import a specific object type from an export job
nue platform import --object-type uom --export-job-id 8d114e99-4524-4914-a930-e07daa0130c2 --wait

# Import all objects from an export job
nue platform import --object-type product --export-job-id 8d114e99-4524-4914-a930-e07daa0130c2 --all-objects --wait

# Import with custom import operation
nue platform import --object-type product --export-job-id 8d114e99-4524-4914-a930-e07daa0130c2 --import-operation insert --wait
```

### Import Transaction Data
### [TODO]
```bash
# Import subscriptions
nue platform import --object-type subscription --file subscriptions.json --wait

# Import customers
nue platform import --object-type customer --file customers.csv --format csv --wait

# Import orders
nue platform import --object-type order --file orders.json --wait

# Import usage data
nue platform import --object-type usage --file usage.json --wait
```

### Import Transaction Hub Data

```bash
# Import transaction hub records
nue platform import --object-type transactionhub --file transaction-hub.json --wait

# Import with external system specification
nue platform import --object-type transactionhub --file transaction-hub.json --external-system "microsoftdynamics" --wait
```

## Advanced Import Examples

### Import Multiple Product Catalog Objects

When you have multiple JSONL files from an export job, you can import them all at once:

```bash
# Import all available objects from export job
nue platform import --object-type product --export-job-id 8d114e99-4524-4914-a930-e07daa0130c2 --all-objects --wait

# This will automatically find and import:
# - uom-8d114e99-4524-4914-a930-e07daa0130c2.jsonl
# - product-8d114e99-4524-4914-a930-e07daa0130c2.jsonl
# - pricebook-8d114e99-4524-4914-a930-e07daa0130c2.jsonl
# - pricetag-8d114e99-4524-4914-a930-e07daa0130c2.jsonl
# - credittype-8d114e99-4524-4914-a930-e07daa0130c2.jsonl
# - creditpool-8d114e99-4524-4914-a930-e07daa0130c2.jsonl
# - creditconversion-8d114e99-4524-4914-a930-e07daa0130c2.jsonl
# - productgroup-8d114e99-4524-4914-a930-e07daa0130c2.jsonl
# - bundle-8d114e99-4524-4914-a930-e07daa0130c2.jsonl
# - bundlesuite-8d114e99-4524-4914-a930-e07daa0130c2.jsonl
# - customsetting-8d114e99-4524-4914-a930-e07daa0130c2.jsonl
```

### Import with Different Operations

```bash
# Upsert (default) - update existing records, insert new ones
nue platform import --object-type product --file products.json --import-operation upsert --wait

# Insert only - only insert new records, fail on existing
nue platform import --object-type product --file products.json --import-operation insert --wait

# Update only - only update existing records, skip new ones
nue platform import --object-type product --file products.json --import-operation update --wait
```

### Import with Verbose Output

```bash
# Show detailed import progress and results
nue platform import --object-type product --file products.json --verbose --wait

# Show detailed output for export job import
nue platform import --object-type product --export-job-id 8d114e99-4524-4914-a930-e07daa0130c2 --verbose --wait
```

## Workflow Examples

### Complete Export and Import Workflow

```bash
# 1. Export all product catalog data
nue platform export --object-type product --sandbox --wait

# 2. Import all exported data back
nue platform import --object-type product --export-job-id <job-id-from-export> --all-objects --wait

# Example with actual job ID:
nue platform export --object-type product --sandbox --wait
# Output: Export job created with ID: 8d114e99-4524-4914-a930-e07daa0130c2
# Files downloaded: uom-8d114e99-4524-4914-a930-e07daa0130c2.jsonl, product-8d114e99-4524-4914-a930-e07daa0130c2.jsonl, etc.

nue platform import --object-type product --export-job-id 8d114e99-4524-4914-a930-e07daa0130c2 --all-objects --wait
# Output: Import job created with ID: abc123-def456-ghi789
# Files uploaded: uom, product, pricebook, etc.
# Import completed successfully!
```

### Import Specific Object Types

```bash
# Import only UOM data from export
nue platform import --object-type uom --export-job-id 8d114e99-4524-4914-a930-e07daa0130c2 --wait

# Import only product data from export
nue platform import --object-type product --export-job-id 8d114e99-4524-4914-a930-e07daa0130c2 --wait

# Import only price book data from export
nue platform import --object-type pricebook --export-job-id 8d114e99-4524-4914-a930-e07daa0130c2 --wait
```

## File Format Examples

### JSON Format

```json
[
  {
    "id": "a0xx0000000XxXxAAV",
    "name": "Usage Product",
    "sku": "USAGE-001",
    "description": "Usage-based product",
    "status": "Active",
    "active": true,
    "autoRenew": true,
    "billingPeriod": "Monthly",
    "billingTiming": "In Advance",
    "configurable": false,
    "priceBookId": "a0xx0000000XxXxBBV",
    "priceModel": "Flat",
    "productCategory": "Usage",
    "recordType": "Usage",
    "soldIndependently": true,
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": null,
    "freeTrialType": "None",
    "freeTrialUnit": null,
    "imageUrl": null,
    "defaultRenewalTerm": 12,
    "defaultSubscriptionTerm": 12,
    "defaultUomId": "Each",
    "creditConversionId": null,
    "creditPoolId": null,
    "externalId": "USAGE-001-EXT",
    "evergreen": false,
    "bundleTemplate": false,
    "carvesEligible": false,
    "carvesLiabilitySegment": null,
    "carvesRevenueSegment": null,
    "contractLiabilitySegment": null,
    "contractRevenueSegment": null,
    "lastPublishedById": null,
    "lastPublishedDate": null,
    "publishStatus": "Draft",
    "productCode": "USAGE-001",
    "taxCategory": "Standard",
    "taxCode": "TAX-001",
    "taxMode": "Taxable",
    "revenueRuleExternalId": null
  }
]
```

### JSONL Format (Recommended for Import)

```jsonl
{"meta": {"objectname": "product"}}
{"id":"a0xx0000000XxXxAAV","name":"Usage Product","sku":"USAGE-001","description":"Usage-based product","status":"Active","active":true,"autoRenew":true,"billingPeriod":"Monthly","billingTiming":"In Advance","configurable":false,"priceBookId":"a0xx0000000XxXxBBV","priceModel":"Flat","productCategory":"Usage","recordType":"Usage","soldIndependently":true,"startDate":"2024-01-01T00:00:00Z","endDate":null,"freeTrialType":"None","freeTrialUnit":null,"imageUrl":null,"defaultRenewalTerm":12,"defaultSubscriptionTerm":12,"defaultUomId":"Each","creditConversionId":null,"creditPoolId":null,"externalId":"USAGE-001-EXT","evergreen":false,"bundleTemplate":false,"carvesEligible":false,"carvesLiabilitySegment":null,"carvesRevenueSegment":null,"contractLiabilitySegment":null,"contractRevenueSegment":null,"lastPublishedById":null,"lastPublishedDate":null,"publishStatus":"Draft","productCode":"USAGE-001","taxCategory":"Standard","taxCode":"TAX-001","taxMode":"Taxable","revenueRuleExternalId":null}
{"id":"a0xx0000000XxXxBBV","name":"Another Product","sku":"PROD-002","description":"Another product","status":"Active","active":true,"autoRenew":true,"billingPeriod":"Monthly","billingTiming":"In Advance","configurable":false,"priceBookId":"a0xx0000000XxXxBBV","priceModel":"Flat","productCategory":"Standard","recordType":"Standard","soldIndependently":true,"startDate":"2024-01-01T00:00:00Z","endDate":null,"freeTrialType":"None","freeTrialUnit":null,"imageUrl":null,"defaultRenewalTerm":12,"defaultSubscriptionTerm":12,"defaultUomId":"Each","creditConversionId":null,"creditPoolId":null,"externalId":"PROD-002-EXT","evergreen":false,"bundleTemplate":false,"carvesEligible":false,"carvesLiabilitySegment":null,"carvesRevenueSegment":null,"contractLiabilitySegment":null,"contractRevenueSegment":null,"lastPublishedById":null,"lastPublishedDate":null,"publishStatus":"Draft","productCode":"PROD-002","taxCategory":"Standard","taxCode":"TAX-001","taxMode":"Taxable","revenueRuleExternalId":null}
```

### CSV Format

```csv
id,name,sku,description,status,active,autoRenew,billingPeriod,billingTiming,configurable,priceBookId,priceModel,productCategory,recordType,soldIndependently,startDate,endDate,freeTrialType,freeTrialUnit,imageUrl,defaultRenewalTerm,defaultSubscriptionTerm,defaultUomId,creditConversionId,creditPoolId,externalId,evergreen,bundleTemplate,carvesEligible,carvesLiabilitySegment,carvesRevenueSegment,contractLiabilitySegment,contractRevenueSegment,lastPublishedById,lastPublishedDate,publishStatus,productCode,taxCategory,taxCode,taxMode,revenueRuleExternalId
a0xx0000000XxXxAAV,Usage Product,USAGE-001,Usage-based product,Active,true,true,Monthly,In Advance,false,a0xx0000000XxXxBBV,Flat,Usage,Usage,true,2024-01-01T00:00:00Z,,None,,,12,12,Each,,,,USAGE-001-EXT,false,false,false,,,,,,,,Draft,USAGE-001,Standard,TAX-001,Taxable,
```

## Transaction Hub Import Examples

### Transaction Hub JSON Format

```json
[
  {
    "transactiontype": "invoice",
    "nueid": "61d9628d-80f0-48d1-b916-2dec7503b20f",
    "externalsystem": "microsoftdynamics",
    "externalsystemid": "ext-01",
    "externalid": "inv-0001",
    "direction": "outbound",
    "description": "The invoice has been transferred"
  },
  {
    "transactiontype": "customer",
    "nueid": "001xx000003DIloAAG",
    "externalsystem": "netsuite",
    "externalsystemid": "ns-01",
    "externalid": "cust-001",
    "direction": "inbound",
    "description": "Customer sync from NetSuite"
  }
]
```

### Transaction Hub CSV Format

```csv
transactiontype,nueid,externalsystem,externalsystemid,externalid,direction,description
invoice,61d9628d-80f0-48d1-b916-2dec7503b20f,microsoftdynamics,ext-01,inv-0001,outbound,The invoice has been transferred
customer,001xx000003DIloAAG,netsuite,ns-01,cust-001,inbound,Customer sync from NetSuite
```

## Advanced Import Options

### Validation Only

```bash
# Validate import file without actually importing
nue platform import --object-type product --file products.json --validate-only

# Dry run - validate and show what would be imported
nue platform import --object-type product --file products.json --dry-run
```

### Error Handling

```bash
# Continue import even if some records fail
nue platform import --object-type product --file products.json --skip-errors --wait

# Get detailed error information
nue platform import --object-type product --file products.json --verbose --wait
```

### Batch Processing

```bash
# Process records in smaller batches
nue platform import --object-type product --file large-products.json --batch-size 500 --wait
```

### Async vs Sync Import

```bash
# Async import (default) - returns job ID immediately
nue platform import --object-type product --file products.json

# Sync import - waits for completion
nue platform import --object-type product --file products.json --wait

# Sync import with custom timeout
nue platform import --object-type product --file products.json --wait --timeout 600
```

## Import Examples by Object Type

### UOM Import

```bash
# Import UOM records
nue platform import --object-type uom --file uom.json --wait

# Import UOM from CSV
nue platform import --object-type uom --file uom.csv --format csv --wait
```

UOM JSON format:
```json
[
  {
    "id": "Each",
    "name": "Each",
    "active": true,
    "decimalScale": 0,
    "quantityDimension": "Each",
    "roundingMode": "Up",
    "termDimension": null,
    "unitCode": "EA",
    "externalId": "EA-EXT",
    "createdDate": "2024-01-01T00:00:00Z",
    "lastModifiedDate": "2024-01-01T00:00:00Z"
  }
]
```

### Subscription Import

```bash
# Import subscriptions
nue platform import --object-type subscription --file subscriptions.json --wait

# Import subscriptions from CSV
nue platform import --object-type subscription --file subscriptions.csv --format csv --wait
```

Subscription JSON format:
```json
[
  {
    "id": "a0xx0000000XxXxAAV",
    "name": "Subscription-001",
    "status": "Active",
    "autoRenew": true,
    "billingPeriod": "Monthly",
    "billingTiming": "In Advance",
    "bundled": false,
    "productId": "a0xx0000000XxXxBBV",
    "customerId": "001xx000003DIloAAG",
    "subscriptionStartDate": "2024-01-01T00:00:00Z",
    "subscriptionEndDate": "2024-12-31T23:59:59Z",
    "subscriptionTerm": 12,
    "actualSubscriptionTerm": 12,
    "listPrice": 100.00,
    "orderProductId": "a0xx0000000XxXxCCV",
    "billCycleDay": 1
  }
]
```

### Customer Import

```bash
# Import customers
nue platform import --object-type customer --file customers.json --wait

# Import customers from CSV
nue platform import --object-type customer --file customers.csv --format csv --wait
```

Customer JSON format:
```json
[
  {
    "id": "001xx000003DIloAAG",
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "phone": "+1-555-123-4567",
    "status": "Active",
    "billingAddress": {
      "street": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "postalCode": "12345",
      "country": "USA"
    },
    "createdDate": "2024-01-01T00:00:00Z",
    "lastModifiedDate": "2024-01-01T00:00:00Z"
  }
]
```

## Error Handling Examples

### Common Error Scenarios

```bash
# Invalid object type
nue platform import --object-type invalid-type --file data.json
# Error: Invalid object type 'invalid-type'. Valid types are: product, products, uom, ...

# File doesn't exist
nue platform import --object-type product --file nonexistent.json
# Error: File 'nonexistent.json' does not exist

# Invalid file format
nue platform import --object-type product --file data.txt
# Error: File format '.txt' does not match specified format 'json'

# Missing API key
nue platform import --object-type product --file data.json
# Error: Unable to proceed without API key

# Invalid transaction hub data
nue platform import --object-type transactionhub --file invalid-data.json
# Error: Record 1 is missing required field: transactiontype

# Timeout error
nue platform import --object-type product --file large-file.json --wait --timeout 1
# Error: Import job timed out after 1 seconds
```

### Validation Errors

```bash
# Validate transaction hub data
nue platform import --object-type transactionhub --file data.json --validate-only

# This will check for:
# - Required fields (transactiontype, nueid, externalsystem, externalsystemid, externalid)
# - Valid transaction types
# - Valid directions (inbound/outbound)
# - Record count limits (max 5000)
```

### Verbose Output

```bash
# Get detailed information about the import process
nue platform import --object-type product --file products.json --verbose --wait
```

This will show:
- File validation results
- Import job creation details
- Upload progress
- Import job status updates
- Detailed error information
- Final import results

## Best Practices

### File Preparation

1. **Validate your data** before importing:
   ```bash
   nue platform import --object-type product --file products.json --validate-only
   ```

2. **Use appropriate file formats**:
   - JSON for complex nested data
   - CSV for simple tabular data
   - JSONL for large datasets

3. **Check field mappings**:
   - Ensure all required fields are present
   - Verify data types match expected formats
   - Handle null/empty values appropriately

### Performance Optimization

1. **Use batch processing** for large files:
   ```bash
   nue platform import --object-type product --file large-file.json --batch-size 1000 --wait
   ```

2. **Use async imports** for large datasets:
   ```bash
   nue platform import --object-type product --file large-file.json
   # Check status later
   ```

3. **Monitor import progress**:
   ```bash
   nue platform import --object-type product --file large-file.json --verbose --wait
   ```

### Error Recovery

1. **Use skip-errors** for partial imports:
   ```bash
   nue platform import --object-type product --file products.json --skip-errors --wait
   ```

2. **Validate before import**:
   ```bash
   nue platform import --object-type product --file products.json --validate-only
   nue platform import --object-type product --file products.json --wait
   ```

3. **Check import results**:
   ```bash
   nue platform import --object-type product --file products.json --verbose --wait
   ``` 