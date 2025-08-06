// Core module barrel exports
module.exports = {
  // Discovery system
  ...require('./discovery'),
  
  // Registry system
  ...require('./registry'),
  
  // Existing core modules
  ...require('./objectTypes'),
  ...require('./validator')
}; 