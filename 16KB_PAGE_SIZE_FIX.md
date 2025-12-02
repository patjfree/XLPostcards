# 16 KB Page Size Support Fix

## Issue
Google Play requires all apps targeting Android 15+ (SDK 35) to support 16 KB page sizes starting November 1, 2025.

## Requirements
1. **NDK r27 or higher** (r28+ compiles 16 KB-aligned by default)
2. **AGP 8.5.1 or higher** (for 16 KB zip alignment of uncompressed libraries)
3. **Uncompressed shared libraries** (`useLegacyPackaging = false`)
4. **16 KB ELF alignment** for all native libraries

## Changes Made

### 1. Updated NDK Version
- **android/build.gradle**: Updated from NDK r26 to **r28.0.12674087**
- **app.config.js**: Updated to **r28.0.12674087**
- **Why r28+**: r28+ compiles 16 KB-aligned by default (r27 requires explicit config that may not apply to all libraries)

### 2. Verified Configuration
- ✅ `expo.useLegacyPackaging=false` in `gradle.properties` (required for uncompressed libraries)
- ✅ `compileSdkVersion: 35` and `targetSdkVersion: 35` in `app.config.js`
- ✅ `buildToolsVersion: "35.0.0"` in `app.config.js`

### 3. Added Config Plugin
- Created `plugins/ensure-16kb-support.js` to verify and document 16 KB support

## How It Works

### NDK r28+ Support
- **NDK r28+ compiles 16 KB-aligned by default** (no additional config needed)
- This ensures ALL native libraries are properly aligned, including those from React Native and Expo
- NDK r27 requires `APP_SUPPORT_FLEXIBLE_PAGE_SIZES := true` which may not apply to all prebuilt libraries

### AGP 8.5.1+ Support
- Expo SDK 52 uses AGP 8.5.1+ which automatically handles 16 KB zip alignment
- When `useLegacyPackaging = false`, AGP ensures uncompressed libraries are 16 KB zip-aligned

### Uncompressed Libraries
- `useLegacyPackaging = false` means libraries are stored uncompressed in the APK
- This allows AGP to properly align them on 16 KB boundaries
- Slightly increases APK size but improves performance and is required for 16 KB devices

## Verification Steps

### 1. Check NDK Version
After building, verify NDK version in build logs:
```
NDK version: 28.0.12674087
```

**Important**: If the build log shows a different NDK version, the configuration may not have been applied. Check that:
- `app.config.js` has `ndkVersion: "28.0.12674087"` in `expo-build-properties`
- `android/build.gradle` has `ndkVersion = "28.0.12674087"`

### 2. Verify Zip Alignment
After building your APK/AAB, run:
```bash
# For APK
zipalign -c -P 16 -v 4 your-app.apk

# For AAB (extract first, then check)
bundletool build-apks --bundle=your-app.aab --output=apks.zip
unzip apks.zip -d apks
zipalign -c -P 16 -v 4 apks/splits/base-arm64_v8a.apk
```

Expected output: `Verification successful`

### 3. Check ELF Alignment (Advanced)
For each `.so` file in your APK:
```bash
# Extract APK
unzip your-app.apk -d temp_apk

# Check each .so file
llvm-objdump -p temp_apk/lib/arm64-v8a/libname.so | grep LOAD

# Look for: align 2**14 (which is 16 KB = 16384 bytes)
# Should NOT see: align 2**13, 2**12, or lower
```

### 4. Test on 16 KB Device/Emulator
1. Set up Android 15 emulator with 16 KB page size system image
2. Install and test your app
3. Run: `adb shell getconf PAGE_SIZE` (should return `16384`)

## Notes

- **AGP Version**: Managed by Expo/React Native. Expo SDK 52 includes AGP 8.5.1+
- **NDK Version**: Now explicitly set to **r28.0.12674087** in both `app.config.js` and `android/build.gradle`
- **Why r28+**: r28+ aligns by default, ensuring all libraries (including prebuilt ones) are 16 KB aligned
- **Legacy Packaging**: Must remain `false` for 16 KB support
- **Performance**: 16 KB page sizes provide performance benefits (faster app launch, lower power draw)

## Troubleshooting

### If build fails:
- Ensure NDK r28+ is available in EAS build environment (should be automatic)
- Check that `expo.useLegacyPackaging=false`
- Verify AGP version is 8.5.1+ (should be automatic with Expo SDK 52)

### If Google Play still rejects after NDK r28:
- **Check build logs** to confirm NDK r28 was actually used
- **Wait 24-48 hours** - Google Play may cache scan results
- **Verify ELF alignment** using `check-elf-alignment.sh` script (requires Android NDK)
- Some **prebuilt libraries** may need updates - check React Native/Expo versions
- See `16KB_TROUBLESHOOTING.md` for detailed troubleshooting

### If Google Play still rejects:
- Verify the actual built APK/AAB with `zipalign` command
- Check that all native libraries are 16 KB aligned
- Ensure you're submitting a NEW build (not an old cached one)

## References
- [Google Play 16 KB Page Size Requirements](https://developer.android.com/guide/practices/page-sizes)
- [Android NDK 16 KB Support](https://developer.android.com/ndk/guides/16kb-page-sizes)

