
#!/bin/bash

# Reset EAS configuration in app.config.js
TEMP_FILE=$(mktemp)
node -e "
const fs = require('fs');
const appConfig = require('../app.config.js');
if (appConfig.extra && appConfig.extra.eas) {
  delete appConfig.extra.eas.projectId;
}
fs.writeFileSync('$TEMP_FILE', 'module.exports = ' + JSON.stringify(appConfig, null, 2) + ';');
" && cat $TEMP_FILE > app.config.js

# Initialize EAS project
echo "Initializing EAS project..."
npx eas init
