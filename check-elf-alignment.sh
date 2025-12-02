#!/bin/bash

# Script to check ELF alignment of native libraries in APK/AAB
# Usage: ./check-elf-alignment.sh <path-to-apk-or-aab>

if [ -z "$1" ]; then
    echo "Usage: ./check-elf-alignment.sh <path-to-apk-or-aab>"
    exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
    echo "Error: File not found: $FILE"
    exit 1
fi

echo "🔍 Checking ELF alignment of native libraries in: $FILE"
echo ""

# Handle AAB files
if [[ "$FILE" == *.aab ]]; then
    echo "📦 Detected AAB file - extracting APKs..."
    
    BUNDLETOOL=""
    if [ -f "./bundletool.jar" ]; then
        BUNDLETOOL="java -jar ./bundletool.jar"
    elif command -v bundletool &> /dev/null; then
        BUNDLETOOL="bundletool"
    else
        echo "❌ bundletool not found"
        exit 1
    fi
    
    TEMP_DIR=$(mktemp -d)
    APKS_ZIP="$TEMP_DIR/apks.zip"
    
    $BUNDLETOOL build-apks --bundle="$FILE" --output="$APKS_ZIP" --mode=universal 2>/dev/null
    unzip -q "$APKS_ZIP" -d "$TEMP_DIR" 2>/dev/null
    
    UNIVERSAL_APK="$TEMP_DIR/universal.apk"
    if [ -f "$UNIVERSAL_APK" ]; then
        FILE="$UNIVERSAL_APK"
    else
        echo "❌ Could not extract universal APK"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    CLEANUP_TEMP=1
else
    CLEANUP_TEMP=0
fi

# Extract APK
TEMP_APK=$(mktemp -d)
unzip -q "$FILE" -d "$TEMP_APK" 2>/dev/null || {
    echo "❌ Failed to extract APK"
    [ $CLEANUP_TEMP -eq 1 ] && rm -rf "$TEMP_DIR"
    exit 1
}

# Check for native libraries
LIB_DIRS=("$TEMP_APK/lib/arm64-v8a" "$TEMP_APK/lib/armeabi-v7a" "$TEMP_APK/lib/x86" "$TEMP_APK/lib/x86_64")
FOUND_LIBS=0
UNALIGNED_LIBS=0

for lib_dir in "${LIB_DIRS[@]}"; do
    if [ ! -d "$lib_dir" ]; then
        continue
    fi
    
    arch=$(basename "$lib_dir")
    echo "📂 Checking $arch libraries..."
    
    for so_file in "$lib_dir"/*.so; do
        if [ ! -f "$so_file" ]; then
            continue
        fi
        
        FOUND_LIBS=1
        lib_name=$(basename "$so_file")
        
        # Check if llvm-objdump is available
        if command -v llvm-objdump &> /dev/null; then
            # Use llvm-objdump
            OBJDUMP="llvm-objdump"
        elif [ -n "$ANDROID_NDK_HOME" ] && [ -f "$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-objdump" ]; then
            # Use NDK's llvm-objdump
            OBJDUMP="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-objdump"
        else
            echo "⚠️  llvm-objdump not found. Install Android NDK or add to PATH"
            echo "   Checking alignment using readelf instead..."
            
            if command -v readelf &> /dev/null; then
                # Try readelf as fallback
                ALIGNMENT=$(readelf -l "$so_file" 2>/dev/null | grep -i "align" | head -1)
                if echo "$ALIGNMENT" | grep -q "0x4000\|16384\|2\*\*14"; then
                    echo "   ✅ $lib_name: 16 KB aligned"
                else
                    echo "   ❌ $lib_name: NOT 16 KB aligned"
                    echo "      $ALIGNMENT"
                    UNALIGNED_LIBS=$((UNALIGNED_LIBS + 1))
                fi
            else
                echo "   ⚠️  Cannot check $lib_name (no objdump/readelf available)"
            fi
            continue
        fi
        
        # Check LOAD segment alignment
        ALIGNMENT_OUTPUT=$($OBJDUMP -p "$so_file" 2>/dev/null | grep -i "LOAD" | grep -i "align")
        
        if [ -z "$ALIGNMENT_OUTPUT" ]; then
            echo "   ⚠️  $lib_name: Could not read alignment info"
            continue
        fi
        
        # Check if any alignment is less than 2**14 (16 KB)
        UNALIGNED=0
        while IFS= read -r line; do
            # Extract alignment value (look for align 2**N)
            if echo "$line" | grep -qE "align 2\*\*(1[0-3]|[0-9])"; then
                # Found alignment less than 2**14
                UNALIGNED=1
                echo "   ❌ $lib_name: NOT 16 KB aligned"
                echo "      $line"
                break
            fi
        done <<< "$ALIGNMENT_OUTPUT"
        
        if [ $UNALIGNED -eq 0 ]; then
            # Check if it's properly aligned (2**14 or higher)
            if echo "$ALIGNMENT_OUTPUT" | grep -qE "align 2\*\*(1[4-9]|[2-9][0-9])"; then
                echo "   ✅ $lib_name: 16 KB aligned (2**14+)"
            else
                # Check for explicit 16384 or 0x4000
                if echo "$ALIGNMENT_OUTPUT" | grep -qE "16384|0x4000|0x10000"; then
                    echo "   ✅ $lib_name: 16 KB aligned"
                else
                    echo "   ⚠️  $lib_name: Alignment unclear"
                    echo "      $ALIGNMENT_OUTPUT"
                fi
            fi
        else
            UNALIGNED_LIBS=$((UNALIGNED_LIBS + 1))
        fi
    done
    echo ""
done

# Cleanup
rm -rf "$TEMP_APK"
[ $CLEANUP_TEMP -eq 1 ] && rm -rf "$TEMP_DIR"

echo ""
if [ $FOUND_LIBS -eq 0 ]; then
    echo "ℹ️  No native libraries found (app may not use native code)"
    echo "   If your app doesn't use native code, it should already support 16 KB"
elif [ $UNALIGNED_LIBS -eq 0 ]; then
    echo "✅ SUCCESS: All native libraries are 16 KB aligned!"
    echo ""
    echo "If Google Play still rejects, check:"
    echo "  1. Ensure you're submitting the latest build"
    echo "  2. Wait for Google Play to re-scan (can take a few hours)"
    echo "  3. Check that all dependencies are 16 KB compatible"
else
    echo "❌ FAILED: Found $UNALIGNED_LIBS unaligned native library/libraries"
    echo ""
    echo "These libraries need to be rebuilt with 16 KB alignment:"
    echo "  - Update NDK to r27+ (already done)"
    echo "  - Rebuild the app"
    echo "  - Check that all third-party native libraries support 16 KB"
    exit 1
fi

