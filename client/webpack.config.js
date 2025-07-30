const path = require('path');

module.exports = {
  // ... existing config
  ignoreWarnings: [
    {
      module: /html2pdf\.js/,
    },
    {
      message: /Failed to parse source map/,
    },
  ],
}; 