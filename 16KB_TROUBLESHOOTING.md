# 16 KB Page Size Troubleshooting

## Issue: Google Play Rejects Despite zipalign Passing

If `zipalign` verification passes but Google Play still rejects, the issue is likely **ELF alignment** of native libraries, not ZIP alignment.

## Root Cause

Google Play checks **two things**:
1. ✅ **ZIP alignment** - Files in the APK are aligned (this passes)
2. ❌ **ELF alignment** - Native libraries (.so files) have 16 KB-aligned LOAD segments (this may be failing)

## Solution: Upgrade to NDK r28+

We've upgraded from NDK r27 to **NDK r28.0.12674087** because:
- **NDK r28+ compiles 16 KB-aligned by default** (no additional config needed)
- **NDK r27** requires explicit `APP_SUPPORT_FLEXIBLE_PAGE_SIZES := true` which may not be applied to all libraries

## Changes Made

1. **Upgraded NDK to r28.0.12674087** in:
   - `app.config.js`
   - `android/build.gradle`

2. **Verified configuration**:
   - ✅ `expo.useLegacyPackaging=false` (required)
   - ✅ `compileSdkVersion: 35` and `targetSdkVersion: 35`
   - ✅ `buildToolsVersion: "35.0.0"`

## Why This Should Fix It

- **NDK r28+** automatically aligns all native code to 16 KB boundaries
- **Prebuilt libraries** from React Native/Expo will be rebuilt with the new NDK
- **All dependencies** will be compiled with 16 KB alignment

## Next Steps

1. **Rebuild your app** with the new NDK version:
   ```bash
   eas build --platform android --profile production --clear-cache
   ```

2. **Verify the build uses NDK r28**:
   - Check build logs for: `NDK version: 28.0.12674087`

3. **Check ELF alignment** (if you have Android NDK installed):
   ```bash
   # Extract APK
   unzip your-app.apk -d temp_apk
   
   # Check alignment (requires Android NDK)
   $ANDROID_NDK_HOME/toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-objdump -p temp_apk/lib/arm64-v8a/libhermes.so | grep LOAD
   
   # Should see: align 2**14 (16 KB) or higher
   # Should NOT see: align 2**13, 2**12, or lower
   ```

4. **Resubmit to Google Play**

## If Still Rejected After NDK r28

### Check Prebuilt Dependencies
Some third-party libraries might be prebuilt with older NDK versions. Check:
- React Native version (0.76.9 should be fine)
- Expo SDK version (52.0.47 should be fine)
- Any custom native modules

### Verify Build Actually Uses NDK r28
Check your EAS build logs to confirm:
```
NDK version: 28.0.12674087
```

If it shows a different version, the NDK version might not be applied correctly.

### Alternative: Use Google's check_elf_alignment.sh Script
Google provides an official script to check ELF alignment:
1. Download from: https://source.android.com/docs/core/architecture/kernel/16kb-page-sizes
2. Run: `check_elf_alignment.sh your-app.apk`
3. Fix any libraries that show as UNALIGNED

## Common Issues

### Issue: Build fails with NDK r28
- **Solution**: Ensure EAS build environment has NDK r28 available
- Expo/EAS should handle this automatically, but you may need to wait for EAS to update

### Issue: Some libraries still not aligned
- **Solution**: Those libraries may be prebuilt. Check if they have updates that support 16 KB
- Contact library maintainers if needed

### Issue: Google Play cache
- **Solution**: Wait 24-48 hours after submitting a new build for Google Play to re-scan
- Make sure version code is incremented

## Verification Commands

```bash
# 1. Check NDK version in build
grep -i "ndk" build-logs.txt | grep -i "version"

# 2. Check zip alignment
zipalign -c -P 16 -v 4 your-app.apk

# 3. Check ELF alignment (requires NDK)
# See check-elf-alignment.sh script
```

