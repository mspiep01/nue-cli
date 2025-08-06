# Nue CLI Utilities

This directory contains centralized utilities that provide consistent patterns across all commands, following SOLID principles and reducing code duplication.

## Architecture Overview

The utilities are organized into focused, single-responsibility modules that can be composed together to build complex functionality:

```
src/utils/
├── errorHandler.js      # Centralized error handling
├── logger.js           # Consistent console output
├── validator.js        # Input validation
├── apiClient.js        # API communication
├── jobManager.js       # Async job management
├── fileUtils.js        # File operations
├── objectTypes.js      # Object type definitions (existing)
├── queryUtils.js       # GraphQL query utilities (existing)
├── apiKeyUtils.js      # API key management (existing)
└── orderUtils.js       # Order-specific utilities (existing)
```

## Utility Modules

### ErrorHandler

Centralized error handling with consistent formatting and behavior.

```javascript
const ErrorHandler = require('./utils/errorHandler');

// Handle API errors
ErrorHandler.handleApiError(error, options, 'importing', objectType);

// Handle validation errors
ErrorHandler.handleValidationError('Invalid object type', options);

// Handle file errors
ErrorHandler.handleFileError(error, filePath, options);

// Handle job failures
ErrorHandler.handleJobFailure(status, options);
```

### Logger

Consistent console output with color coding and verbose mode support.

```javascript
const Logger = require('./utils/logger');

// Basic logging
Logger.info('Starting import...', options);
Logger.success('Import completed successfully!');
Logger.warning('Some records were skipped');
Logger.error('Import failed');

// Verbose logging (only shown when --verbose is enabled)
Logger.verbose('Debug information', options);
Logger.debug('API Response', responseData, options);

// Specialized logging
Logger.jobStatus('Processing');
Logger.progress('Waiting for completion...');
Logger.fileOperation('Uploading', filePath, { fileSize: 1024 });
Logger.summary('Import Results', { success: 100, failed: 5 });
```

### Validator

Input validation with consistent error handling.

```javascript
const Validator = require('./utils/validator');

// Validate object type
Validator.validateObjectType(objectType, options);

// Validate file exists and format
Validator.validateFileExists(filePath, options);
Validator.validateFileFormat(filePath, 'json', options);

// Validate API key and job ID
Validator.validateApiKey(apiKey, options);
Validator.validateJobId(jobId, options);

// Validate date filters
Validator.validateDateFilter('1 day ago', options);

// Validate transaction hub data
Validator.validateTransactionHubData(data, options);
```

### ApiClient

Centralized API communication with consistent error handling and logging.

```javascript
const ApiClient = require('./utils/apiClient');

// Create client
const apiClient = new ApiClient(apiKey, options);

// Basic HTTP methods
await apiClient.get('/endpoint', { param: 'value' });
await apiClient.post('/endpoint', { data: 'value' });
await apiClient.patch('/endpoint', { data: 'value' });

// Specialized methods
await apiClient.createExportJob(payload);
await apiClient.createImportJob(payload);
await apiClient.createProductCatalogImportJob('upsert');
await apiClient.uploadImportFile(jobId, formData);
await apiClient.getExportJobStatus(jobId);
await apiClient.getImportJobStatus(jobId);
await apiClient.downloadFile(url);
```

### JobManager

Async job management with consistent polling and status handling.

```javascript
const JobManager = require('./utils/jobManager');

// Wait for job completion
const status = await JobManager.waitForExportCompletion(jobId, apiClient, options);
const status = await JobManager.waitForImportCompletion(jobId, apiClient, options);
const status = await JobManager.waitForTransactionHubImportCompletion(jobId, apiClient, options);

// Display job summary
JobManager.displayJobSummary(status, options);
```

### FileUtils

File operations with consistent error handling and format support.

```javascript
const FileUtils = require('./utils/fileUtils');

// Parse files
const data = FileUtils.parseImportFile(filePath, options);
const data = FileUtils.parseCSV(content);

// Convert formats
const csvData = FileUtils.convertToCSV(data);
const jsonlFile = FileUtils.convertToJSONL(filePath, objectType, options);
const importFile = FileUtils.convertExportedFileToImportFormat(filePath, objectType);

// Form data creation
const formData = FileUtils.createFormData(filePath, fieldName);
const formData = FileUtils.createMultiFileFormData(files, getFieldName);

// File operations
FileUtils.writeOutput(data, outputPath, options);
const files = FileUtils.findDownloadedFiles(exportJobId, objectType, options);
const size = FileUtils.getFileSize(filePath);
FileUtils.cleanupTempFiles(files, options);
```

## Usage Patterns

### Command Structure

All commands should follow this pattern:

```javascript
const Validator = require('../utils/validator');
const Logger = require('../utils/logger');
const ApiClient = require('../utils/apiClient');
const ErrorHandler = require('../utils/errorHandler');

module.exports = function(program) {
  program
    .command('example <param>')
    .description('Example command')
    .option('--verbose', 'Show detailed output', false)
    .action(async (param, options) => {
      try {
        // 1. Validate inputs
        Validator.validateObjectType(param, options);
        
        // 2. Get API key
        const apiKey = await checkAndPromptForApiKey(options.sandbox);
        Validator.validateApiKey(apiKey, options);
        
        // 3. Create API client
        const apiClient = new ApiClient(apiKey, options);
        
        // 4. Log progress
        Logger.info(`Processing ${param}...`, options);
        
        // 5. Make API calls
        const result = await apiClient.post('/endpoint', { data: param });
        
        // 6. Handle success
        Logger.success('Operation completed successfully!');
        
      } catch (error) {
        // 7. Handle errors consistently
        ErrorHandler.handleApiError(error, options, 'processing', param);
      }
    });
};
```

### Import Command Pattern

```javascript
async function importData(objectType, file, apiClient, options) {
  // Validate inputs
  Validator.validateObjectType(objectType, options);
  Validator.validateFileExists(file, options);
  Validator.validateFileFormat(file, options.format, options);
  
  // Log progress
  Logger.info(`Importing ${objectType} data from ${file}...`, options);
  
  // Create job
  const jobResponse = await apiClient.createImportJob(payload);
  const jobId = jobResponse.jobid;
  Logger.success(`Import job created with ID: ${jobId}`);
  
  // Upload file
  const formData = FileUtils.createFormData(file, fieldName);
  await apiClient.uploadImportFile(jobId, formData);
  Logger.success('File uploaded successfully');
  
  // Wait for completion if requested
  if (options.wait) {
    await JobManager.waitForImportCompletion(jobId, apiClient, options);
  } else {
    Logger.warning('Job is running asynchronously. Use --wait to wait for completion.');
  }
}
```

### Export Command Pattern

```javascript
async function exportData(objectType, apiClient, options) {
  // Validate inputs
  Validator.validateObjectType(objectType, options);
  
  // Log progress
  Logger.info(`Creating export job for ${objectType}...`, options);
  
  // Build query
  const { query, variables } = buildExportQuery(objectType, options);
  Logger.verbose('GraphQL query:', options);
  Logger.verbose(query, options);
  
  // Create job
  const jobResponse = await apiClient.createExportJob({ query, variables });
  const jobId = jobResponse.jobid;
  Logger.success('Export job created successfully!');
  Logger.info(`Job ID: ${jobId}`);
  
  // Wait for completion if requested
  if (options.wait) {
    Logger.progress('Waiting for job completion...');
    const status = await JobManager.waitForExportCompletion(jobId, apiClient, options);
    
    if (options.download) {
      await downloadExportResults(status, apiClient, options);
    }
  } else {
    Logger.warning('Job is running asynchronously.');
    Logger.info(`To download results: nue download ${jobId}`);
  }
}
```

## Benefits

### 1. Reduced Code Duplication

- **Before**: Each command had its own error handling, logging, and validation logic
- **After**: Centralized utilities eliminate duplication across commands

### 2. Consistent Behavior

- **Before**: Different commands handled errors and logging differently
- **After**: All commands use the same patterns for consistent user experience

### 3. Easier Maintenance

- **Before**: Changes to error handling required updates in multiple files
- **After**: Changes are made in one place and automatically applied everywhere

### 4. Better Testing

- **Before**: Each command had to be tested individually for common patterns
- **After**: Utilities can be tested independently, reducing test complexity

### 5. Improved Readability

- **Before**: Commands were cluttered with boilerplate code
- **After**: Commands focus on their core logic, making them easier to understand

## Migration Guide

To migrate existing commands to use the new utilities:

1. **Replace error handling**:
   ```javascript
   // Before
   console.error(chalk.red(`Error: ${error.message}`));
   process.exit(1);
   
   // After
   ErrorHandler.handleApiError(error, options, 'processing', objectType);
   ```

2. **Replace logging**:
   ```javascript
   // Before
   console.log(chalk.blue('Processing...'));
   console.log(chalk.green('Success!'));
   
   // After
   Logger.info('Processing...', options);
   Logger.success('Success!');
   ```

3. **Replace validation**:
   ```javascript
   // Before
   if (!isValidObjectType(objectType)) {
     console.error(chalk.red(`Invalid object type: ${objectType}`));
     process.exit(1);
   }
   
   // After
   Validator.validateObjectType(objectType, options);
   ```

4. **Replace API calls**:
   ```javascript
   // Before
   const response = await axios.post(url, data, { headers });
   
   // After
   const apiClient = new ApiClient(apiKey, options);
   const response = await apiClient.post('/endpoint', data);
   ```

5. **Replace job management**:
   ```javascript
   // Before
   while (true) {
     const status = await getJobStatus(jobId);
     if (status.status === 'completed') break;
     await sleep(5000);
   }
   
   // After
   await JobManager.waitForExportCompletion(jobId, apiClient, options);
   ```

## Best Practices

1. **Always use the utilities** - Don't reinvent error handling, logging, or validation
2. **Pass options consistently** - Always pass the options object to utilities that need it
3. **Use appropriate log levels** - Use `Logger.verbose()` for debug info, `Logger.info()` for progress
4. **Handle errors at the command level** - Let utilities handle the details, but catch errors in the command
5. **Validate early** - Validate inputs as soon as possible in the command flow
6. **Use the API client** - Don't make direct axios calls, use the centralized client
7. **Clean up resources** - Use `FileUtils.cleanupTempFiles()` for temporary files

## Future Enhancements

- Add unit tests for all utilities
- Add TypeScript definitions
- Add performance monitoring
- Add retry logic for transient failures
- Add caching for frequently accessed data
- Add plugin system for extensibility 