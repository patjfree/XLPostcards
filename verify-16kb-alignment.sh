#!/bin/bash

# Script to verify 16 KB page size alignment
# Usage: ./verify-16kb-alignment.sh <path-to-apk-or-aab>

if [ -z "$1" ]; then
    echo "Usage: ./verify-16kb-alignment.sh <path-to-apk-or-aab>"
    echo "Example: ./verify-16kb-alignment.sh build/app-release.apk"
    exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
    echo "Error: File not found: $FILE"
    exit 1
fi

echo "🔍 Checking 16 KB page size alignment in: $FILE"
echo ""

# Check if it's an AAB or APK
if [[ "$FILE" == *.aab ]]; then
    echo "📦 Detected AAB file - extracting APKs..."
    
    # Check for bundletool
    BUNDLETOOL=""
    if [ -f "./bundletool.jar" ]; then
        BUNDLETOOL="java -jar ./bundletool.jar"
    elif command -v bundletool &> /dev/null; then
        BUNDLETOOL="bundletool"
    else
        echo "❌ bundletool not found. Options:"
        echo "   1. Download bundletool.jar and place it in this directory"
        echo "   2. Install bundletool: https://github.com/google/bundletool/releases"
        echo ""
        echo "   Or manually extract APKs:"
        echo "   bundletool build-apks --bundle=$FILE --output=apks.zip"
        echo "   unzip apks.zip -d apks"
        echo "   Then run this script on apks/splits/base-arm64_v8a.apk"
        exit 1
    fi
    
    # Create temp directory for extracted APKs
    TEMP_DIR=$(mktemp -d)
    APKS_ZIP="$TEMP_DIR/apks.zip"
    
    echo "   Building APKs from AAB..."
    $BUNDLETOOL build-apks --bundle="$FILE" --output="$APKS_ZIP" --mode=universal 2>/dev/null
    
    if [ ! -f "$APKS_ZIP" ]; then
        echo "❌ Failed to extract APKs from AAB"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    echo "   Extracting APKs..."
    unzip -q "$APKS_ZIP" -d "$TEMP_DIR" 2>/dev/null || {
        echo "❌ Failed to extract APKs zip"
        rm -rf "$TEMP_DIR"
        exit 1
    }
    
    # Find the universal APK or base split APK
    UNIVERSAL_APK="$TEMP_DIR/universal.apk"
    BASE_APK="$TEMP_DIR/splits/base-arm64_v8a.apk"
    BASE_APK_ALT="$TEMP_DIR/splits/base-arm64_v8a-master.apk"
    
    if [ -f "$UNIVERSAL_APK" ]; then
        APK_TO_CHECK="$UNIVERSAL_APK"
        echo "   Found universal APK"
    elif [ -f "$BASE_APK" ]; then
        APK_TO_CHECK="$BASE_APK"
        echo "   Found base arm64-v8a APK"
    elif [ -f "$BASE_APK_ALT" ]; then
        APK_TO_CHECK="$BASE_APK_ALT"
        echo "   Found base arm64-v8a APK (alternate)"
    else
        echo "⚠️  Could not find universal or base APK, checking all splits..."
        # Check all APKs in splits directory
        APK_TO_CHECK=""
        for apk in "$TEMP_DIR"/splits/*.apk; do
            if [ -f "$apk" ]; then
                APK_TO_CHECK="$apk"
                echo "   Checking: $(basename "$apk")"
                break
            fi
        done
        
        if [ -z "$APK_TO_CHECK" ]; then
            echo "❌ Could not find any APK files in extracted bundle"
            rm -rf "$TEMP_DIR"
            exit 1
        fi
    fi
    
    echo ""
    echo "🔍 Checking extracted APK: $(basename "$APK_TO_CHECK")"
    echo ""
    
    # Continue with the extracted APK
    FILE="$APK_TO_CHECK"
    CLEANUP_TEMP=1
    
elif [[ "$FILE" == *.apk ]]; then
    echo "📦 Detected APK file"
    CLEANUP_TEMP=0
else
    echo "❌ Unknown file type. Expected .apk or .aab"
    exit 1
fi

# Check for zipalign
if ! command -v zipalign &> /dev/null; then
    echo "❌ zipalign not found. Install Android SDK build-tools:"
    echo "   Android Studio > SDK Manager > SDK Tools > Android SDK Build-Tools"
    echo "   Or: sdkmanager 'build-tools;35.0.0'"
    exit 1
fi

echo ""
echo "🔎 Running zipalign verification..."
echo ""

# Run zipalign check with 16 KB page size
# -c: check alignment
# -P 16: page size 16 KB (16384 bytes)
# -v: verbose
# 4: alignment in bytes (4 = 2^2, but we're checking for 16 KB = 2^14)
zipalign -c -P 16 -v 4 "$FILE" 2>&1

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ SUCCESS: APK is properly aligned for 16 KB page sizes!"
    echo ""
    echo "Your app should pass Google Play's 16 KB page size requirement."
else
    echo "❌ FAILED: APK is not properly aligned for 16 KB page sizes"
    echo ""
    echo "Issues to check:"
    echo "  1. Ensure NDK version is r27+ (currently: 27.0.12077973)"
    echo "  2. Ensure useLegacyPackaging = false"
    echo "  3. Ensure AGP version is 8.5.1+ (should be automatic with Expo SDK 52)"
    echo "  4. Rebuild the app after making changes"
    exit 1
fi

echo ""
echo "📋 Additional checks you can perform:"
echo ""
echo "1. Check ELF alignment of native libraries:"
if [ $CLEANUP_TEMP -eq 1 ]; then
    echo "   (APK already extracted to: $TEMP_DIR)"
    echo "   llvm-objdump -p $TEMP_DIR/lib/arm64-v8a/*.so | grep LOAD"
else
    echo "   unzip $FILE -d temp_apk"
    echo "   llvm-objdump -p temp_apk/lib/arm64-v8a/*.so | grep LOAD"
fi
echo "   (Look for 'align 2**14' - should NOT see 2**13 or lower)"
echo ""
echo "2. Test on 16 KB emulator:"
echo "   - Set up Android 15 emulator with 16 KB system image"
echo "   - Install and test your app"
echo "   - Run: adb shell getconf PAGE_SIZE (should return 16384)"

# Cleanup temp directory if we created one
if [ $CLEANUP_TEMP -eq 1 ]; then
    rm -rf "$TEMP_DIR"
fi

