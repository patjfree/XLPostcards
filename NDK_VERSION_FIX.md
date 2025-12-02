# NDK Version Not Being Applied in EAS Builds

## Problem
EAS builds are still using NDK r26 (26.1.10909125) instead of NDK r28 (28.0.12674087), even though we've configured r28 in multiple places.

## Root Cause
EAS may be:
1. Using a cached/pre-installed NDK version
2. Not applying `expo-build-properties` NDK version correctly
3. Installing NDK based on other dependencies that require r26

## Solution Applied

We've set the NDK version in **three places** to ensure it's applied:

### 1. `app.config.js` (expo-build-properties plugin)
```javascript
["expo-build-properties", {
  android: {
    ndkVersion: "28.0.12674087",
    // ...
  }
}]
```

### 2. `android/gradle.properties`
```properties
android.ndkVersion=28.0.12674087
```

### 3. `android/build.gradle`
```groovy
ndkVersion = findProperty('android.ndkVersion') ?: "28.0.12674087"
```

### 4. `android/app/build.gradle`
```groovy
ndkVersion rootProject.hasProperty('ndkVersion') ? rootProject.ext.ndkVersion : "28.0.12674087"
```

## Next Steps

1. **Clear EAS build cache completely**:
   ```bash
   eas build --platform android --profile production --clear-cache
   ```

2. **Check build logs** for:
   ```
   Installing NDK (Side by side) 28.0.12674087
   ```
   NOT:
   ```
   Installing NDK (Side by side) 26.1.10909125
   ```

3. **If still using r26**, the issue might be:
   - **EAS build image** doesn't have NDK r28 available
   - **React Native/Expo dependencies** are forcing r26
   - **Build cache** is persisting despite `--clear-cache`

## Alternative: Force NDK Installation in EAS

If the above doesn't work, you may need to:

1. **Check EAS build image version**:
   - In `eas.json`, try specifying a newer image:
   ```json
   "android": {
     "image": "latest"  // or try a specific version
   }
   ```

2. **Add prebuild hook** to install NDK r28:
   Create `eas-hooks/pre-build.sh`:
   ```bash
   #!/bin/bash
   sdkmanager "ndk;28.0.12674087"
   ```

3. **Contact Expo Support** if NDK r28 isn't available in EAS build images yet

## Verification

After rebuilding, check the build logs for:
- ✅ `Installing NDK (Side by side) 28.0.12674087`
- ✅ `NDK version: 28.0.12674087` in build output
- ❌ NOT `Installing NDK (Side by side) 26.1.10909125`

## Why This Matters

- **NDK r26**: Does NOT compile 16 KB-aligned by default
- **NDK r28**: Compiles 16 KB-aligned by default
- **Google Play**: Requires 16 KB alignment for Android 15+ apps

Without NDK r28, your native libraries won't be 16 KB aligned, causing Google Play rejections.

