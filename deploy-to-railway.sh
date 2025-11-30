#!/bin/bash

# Complete workflow: Sync PostcardService and deploy to Railway via GitHub

SOURCE_DIR="/Users/patrickfreeburger/Documents/Local_MyApps/XLPostcards/PostcardService/"
TARGET_DIR="/Users/patrickfreeburger/Documents/GitHub/PostcardService/"

echo "🚀 Starting PostcardService deployment to Railway..."
echo ""

# Step 1: Sync files
echo "📁 Step 1: Syncing files from Local_MyApps to GitHub..."
rsync -av --delete \
  --exclude='.git' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.DS_Store' \
  "$SOURCE_DIR" "$TARGET_DIR"

if [ $? -ne 0 ]; then
    echo "❌ File sync failed!"
    exit 1
fi
echo "✅ Files synced successfully!"
echo ""

# Step 2: Git operations
echo "📝 Step 2: Committing to GitHub..."
cd "$TARGET_DIR"

# Check if there are changes
if git diff --quiet && git diff --cached --quiet; then
    echo "ℹ️  No changes detected - nothing to commit"
    echo "✅ Repository is already up to date!"
    exit 0
fi

# Add all changes
git add .

# Get commit message from user or use default
if [ -z "$1" ]; then
    COMMIT_MSG="Sync PostcardService from Local_MyApps - $(date '+%Y-%m-%d %H:%M')"
else
    COMMIT_MSG="$1"
fi

# Commit changes
git commit -m "$COMMIT_MSG"

if [ $? -ne 0 ]; then
    echo "❌ Git commit failed!"
    exit 1
fi

# Push to GitHub
echo "🔄 Pushing to GitHub..."
git push

if [ $? -ne 0 ]; then
    echo "❌ Git push failed!"
    exit 1
fi

echo "✅ Successfully pushed to GitHub!"
echo ""
echo "🚀 Railway will now auto-deploy from GitHub"
echo "💡 You can monitor the deployment at: https://railway.app"
echo ""
echo "🔗 GitHub repository updated at:"
echo "   https://github.com/[your-username]/PostcardService"