#!/bin/bash

# Sync PostcardService from Local_MyApps to GitHub directory
# This ensures Railway always gets the latest changes

SOURCE_DIR="/Users/patrickfreeburger/Documents/Local_MyApps/XLPostcards/PostcardService/"
TARGET_DIR="/Users/patrickfreeburger/Documents/GitHub/PostcardService/"

echo "🔄 Syncing PostcardService from Local_MyApps to GitHub..."
echo "Source: $SOURCE_DIR"
echo "Target: $TARGET_DIR"

# Use rsync to sync directories (preserves timestamps, only copies changed files)
rsync -av --delete \
  --exclude='.git' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.DS_Store' \
  "$SOURCE_DIR" "$TARGET_DIR"

if [ $? -eq 0 ]; then
    echo "✅ Sync completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. cd /Users/patrickfreeburger/Documents/GitHub/PostcardService"
    echo "2. git add ."
    echo "3. git commit -m 'Sync from Local_MyApps'"
    echo "4. git push"
    echo ""
    echo "🚀 Railway will auto-deploy from GitHub"
else
    echo "❌ Sync failed!"
    exit 1
fi