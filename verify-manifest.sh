#!/bin/bash

# Script to verify AndroidManifest.xml doesn't contain READ_MEDIA permissions
# Usage: ./verify-manifest.sh <path-to-apk-or-aab>

if [ -z "$1" ]; then
    echo "Usage: ./verify-manifest.sh <path-to-apk-or-aab>"
    echo "Example: ./verify-manifest.sh build/app-release.apk"
    exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
    echo "Error: File not found: $FILE"
    exit 1
fi

echo "🔍 Checking AndroidManifest.xml in: $FILE"
echo ""

# Check if it's an AAB or APK
if [[ "$FILE" == *.aab ]]; then
    echo "📦 Detected AAB file - extracting manifest..."
    # For AAB, we need to extract the manifest from the base/manifest/AndroidManifest.xml
    # Use bundletool or unzip
    TEMP_DIR=$(mktemp -d)
    unzip -q "$FILE" -d "$TEMP_DIR" 2>/dev/null || {
        echo "❌ Failed to extract AAB. Make sure you have unzip installed."
        echo "   Alternatively, use bundletool to extract:"
        echo "   bundletool dump manifest --bundle=$FILE"
        rm -rf "$TEMP_DIR"
        exit 1
    }
    
    # AAB structure: base/manifest/AndroidManifest.xml (binary)
    MANIFEST_PATH="$TEMP_DIR/base/manifest/AndroidManifest.xml"
    
    if [ ! -f "$MANIFEST_PATH" ]; then
        echo "❌ Could not find manifest in AAB. Trying alternative method..."
        # Try using aapt2 or bundletool
        if command -v bundletool &> /dev/null; then
            echo "Using bundletool to extract manifest..."
            bundletool dump manifest --bundle="$FILE" > "$TEMP_DIR/manifest.xml" 2>/dev/null
            MANIFEST_PATH="$TEMP_DIR/manifest.xml"
        else
            echo "⚠️  Install bundletool for better AAB support:"
            echo "   https://github.com/google/bundletool/releases"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
    fi
    
elif [[ "$FILE" == *.apk ]]; then
    echo "📦 Detected APK file - extracting manifest..."
    TEMP_DIR=$(mktemp -d)
    unzip -q "$FILE" -d "$TEMP_DIR" 2>/dev/null || {
        echo "❌ Failed to extract APK"
        rm -rf "$TEMP_DIR"
        exit 1
    }
    MANIFEST_PATH="$TEMP_DIR/AndroidManifest.xml"
else
    echo "❌ Unknown file type. Expected .apk or .aab"
    exit 1
fi

if [ ! -f "$MANIFEST_PATH" ]; then
    echo "❌ Could not find AndroidManifest.xml in extracted files"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Check if manifest is binary (needs conversion)
if file "$MANIFEST_PATH" | grep -q "binary\|data"; then
    echo "📄 Manifest is in binary format - converting to XML..."
    
    # Try using aapt2 to dump
    if command -v aapt2 &> /dev/null; then
        aapt2 dump xmltree "$FILE" AndroidManifest.xml > "$TEMP_DIR/manifest-text.txt" 2>/dev/null
        MANIFEST_TEXT="$TEMP_DIR/manifest-text.txt"
    elif command -v aapt &> /dev/null; then
        aapt dump xmltree "$FILE" AndroidManifest.xml > "$TEMP_DIR/manifest-text.txt" 2>/dev/null
        MANIFEST_TEXT="$TEMP_DIR/manifest-text.txt"
    else
        echo "⚠️  Manifest is binary. Install Android SDK build-tools (aapt or aapt2) to convert."
        echo "   Or use: axml2xml (pip install axmlparserpy)"
        echo ""
        echo "Checking binary manifest directly with grep..."
        MANIFEST_TEXT="$MANIFEST_PATH"
    fi
else
    MANIFEST_TEXT="$MANIFEST_PATH"
fi

echo ""
echo "🔎 Searching for READ_MEDIA permissions..."
echo ""

# Check for the permissions
FOUND_ISSUES=0

if grep -qi "READ_MEDIA_IMAGES" "$MANIFEST_TEXT" 2>/dev/null; then
    echo "❌ FOUND: READ_MEDIA_IMAGES permission"
    grep -i "READ_MEDIA_IMAGES" "$MANIFEST_TEXT" | head -5
    FOUND_ISSUES=1
else
    echo "✅ READ_MEDIA_IMAGES: Not found"
fi

if grep -qi "READ_MEDIA_VIDEO" "$MANIFEST_TEXT" 2>/dev/null; then
    echo "❌ FOUND: READ_MEDIA_VIDEO permission"
    grep -i "READ_MEDIA_VIDEO" "$MANIFEST_TEXT" | head -5
    FOUND_ISSUES=1
else
    echo "✅ READ_MEDIA_VIDEO: Not found"
fi

if grep -qi "READ_EXTERNAL_STORAGE" "$MANIFEST_TEXT" 2>/dev/null; then
    echo "⚠️  FOUND: READ_EXTERNAL_STORAGE permission (legacy, may be acceptable)"
    grep -i "READ_EXTERNAL_STORAGE" "$MANIFEST_TEXT" | head -3
else
    echo "✅ READ_EXTERNAL_STORAGE: Not found"
fi

echo ""
echo "🔎 Checking for uses-permission nodes..."
echo ""

# Count uses-permission nodes
PERM_COUNT=$(grep -c "uses-permission" "$MANIFEST_TEXT" 2>/dev/null || echo "0")
echo "Found $PERM_COUNT uses-permission nodes"

# Show all uses-permission-sdk-* nodes
SDK_PERMS=$(grep -i "uses-permission-sdk" "$MANIFEST_TEXT" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SDK_PERMS" -gt 0 ]; then
    echo "Found $SDK_PERMS SDK-specific permission nodes:"
    grep -i "uses-permission-sdk" "$MANIFEST_TEXT" | head -10
fi

echo ""
if [ $FOUND_ISSUES -eq 0 ]; then
    echo "✅ SUCCESS: No READ_MEDIA permissions found in manifest!"
    echo ""
    echo "If Google Play still rejects, the issue might be:"
    echo "  1. You're submitting an old build (rebuild with the new plugin)"
    echo "  2. Permissions are in a different format/location"
    echo "  3. Google Play is checking a cached version"
    exit 0
else
    echo "❌ FAILED: READ_MEDIA permissions are still present!"
    echo ""
    echo "The plugin may not be working correctly. Check:"
    echo "  1. Is the plugin listed in app.config.js plugins array?"
    echo "  2. Did you rebuild after adding the plugin?"
    echo "  3. Check the build logs for plugin execution"
    exit 1
fi

# Cleanup
rm -rf "$TEMP_DIR"

