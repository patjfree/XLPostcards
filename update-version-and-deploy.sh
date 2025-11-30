#!/bin/bash

# Complete workflow: Update version, sync, and deploy to Railway

if [ -z "$1" ]; then
    echo "❌ Please provide a version number"
    echo "Usage: ./update-version-and-deploy.sh 2.1.1.2"
    echo "Example: ./update-version-and-deploy.sh 2.1.1.2 'Fix emoji rendering'"
    exit 1
fi

NEW_VERSION="$1"
COMMIT_MSG="${2:-Update to version $NEW_VERSION}"

echo "🔄 Updating PostcardService to version $NEW_VERSION..."
echo ""

# Update version in app.config.js
APP_CONFIG="/Users/patrickfreeburger/Documents/Local_MyApps/XLPostcards/app.config.js"
if [ -f "$APP_CONFIG" ]; then
    echo "📝 Updating version in app.config.js to $NEW_VERSION..."
    sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" "$APP_CONFIG"
    echo "✅ Version updated in app.config.js"
else
    echo "⚠️  app.config.js not found, skipping version update"
fi

# Update version in PostcardService files
MAIN_PY="/Users/patrickfreeburger/Documents/Local_MyApps/XLPostcards/PostcardService/main.py"
if [ -f "$MAIN_PY" ]; then
    echo "📝 Updating version in main.py to $NEW_VERSION..."
    sed -i '' "s/version=\"[^\"]*\"/version=\"$NEW_VERSION\"/" "$MAIN_PY"
    sed -i '' "s/v[0-9]\+\.[0-9]\+\.[0-9]\+\(\.[0-9]\+\)\?/v$NEW_VERSION/g" "$MAIN_PY"
    echo "✅ Version updated in main.py"
fi

HEALTH_PY="/Users/patrickfreeburger/Documents/Local_MyApps/XLPostcards/PostcardService/app/routers/health.py"
if [ -f "$HEALTH_PY" ]; then
    echo "📝 Updating version in health.py to $NEW_VERSION..."
    sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" "$HEALTH_PY"
    echo "✅ Version updated in health.py"
fi

echo ""

# Now deploy
echo "🚀 Deploying to Railway..."
./deploy-to-railway.sh "$COMMIT_MSG"

echo ""
echo "✅ Update and deployment complete!"
echo "📱 App version: $NEW_VERSION"
echo "🖥️  Server version: $NEW_VERSION"