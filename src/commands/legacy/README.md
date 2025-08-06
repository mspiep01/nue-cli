# Legacy Commands

This directory contains legacy command implementations that were moved to prevent registration conflicts with the new auto-discovery system.

## Why These Commands Were Moved

These commands were causing registration errors in the auto-discovery system due to:
- Missing dependencies
- Incompatible command structures
- Registration conflicts with configurable commands

## Moved Commands

- `activateChangeOrder.js` - Activate change order command
- `activateOrder.js` - Activate order command  
- `createChangeOrder.js` - Create change order command
- `createOrder.js` - Create order command
- `exportData.js` - Export data command
- `getSubscriptions.js` - Get subscriptions command
- `importData.js` - Import data command
- `queryObjects.js` - Query objects command
- `setApiKey.js` - Set API key command
- `uploadUsage.js` - Upload usage command

## Current Status

These commands have been replaced by:
1. **Configurable Commands**: Generated from `src/config/commandConfigs.js`
2. **New Command Structure**: Using the auto-discovery system
3. **Improved Architecture**: Better separation of concerns

## Migration Notes

- The functionality of these commands is preserved through the configurable command system
- New commands follow the improved architecture with better error handling
- The auto-discovery system provides a cleaner, more maintainable approach

## Future Plans

These legacy commands may be:
- Refactored to work with the new system
- Replaced entirely by configurable commands
- Used as reference for implementing new features

## Current Working Commands

The following commands are working in the main system:
- `query.js` - Query objects (fully functional)
- Platform commands in `src/commands/platform/`
- Lifecycle commands in `src/commands/lifecycle/`
- Config commands in `src/commands/config/` 