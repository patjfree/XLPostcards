# How to Verify AndroidManifest.xml

## Quick Method (Using the Script)

1. **Build your app** (APK or AAB):
   ```bash
   # For APK
   eas build --platform android --profile production
   
   # Or build locally
   cd android && ./gradlew assembleRelease
   ```

2. **Run the verification script**:
   ```bash
   ./verify-manifest.sh <path-to-your-apk-or-aab>
   
   # Example:
   ./verify-manifest.sh android/app/build/outputs/apk/release/app-release.apk
   # Or for AAB:
   ./verify-manifest.sh build-*.aab
   ```

## Manual Method

### For APK Files

1. **Extract the APK**:
   ```bash
   unzip -d temp_manifest your-app.apk
   ```

2. **Convert binary manifest to text** (if needed):
   ```bash
   # Using aapt (Android SDK build-tools)
   aapt dump xmltree your-app.apk AndroidManifest.xml > manifest.txt
   
   # Or using aapt2
   aapt2 dump xmltree your-app.apk AndroidManifest.xml > manifest.txt
   ```

3. **Search for permissions**:
   ```bash
   grep -i "READ_MEDIA" manifest.txt
   grep -i "uses-permission" manifest.txt
   ```

### For AAB Files

1. **Extract the AAB**:
   ```bash
   unzip -d temp_aab your-app.aab
   ```

2. **Use bundletool** (recommended):
   ```bash
   # Download bundletool from: https://github.com/google/bundletool/releases
   bundletool dump manifest --bundle=your-app.aab > manifest.txt
   ```

3. **Or extract manually**:
   ```bash
   unzip -d temp_aab your-app.aab
   # Manifest is at: temp_aab/base/manifest/AndroidManifest.xml (binary)
   # Convert with aapt/aapt2 as above
   ```

## What to Look For

### ✅ Good (No permissions found):
```
✅ READ_MEDIA_IMAGES: Not found
✅ READ_MEDIA_VIDEO: Not found
```

### ❌ Bad (Permissions still present):
```
❌ FOUND: READ_MEDIA_IMAGES permission
❌ FOUND: READ_MEDIA_VIDEO permission
```

## If Permissions Are Still Found

1. **Check plugin is in app.config.js**:
   ```javascript
   plugins: [
     // ... other plugins
     "./plugins/remove-media-permissions", // Should be here
     // ...
   ]
   ```

2. **Verify plugin runs during build**:
   - Check build logs for: `[REMOVE-MEDIA-PERMISSIONS]`
   - Should see: "Stripped media read permissions from all uses-permission* nodes"

3. **Make sure you rebuilt**:
   - Delete `android/app/build` folder
   - Run `npx expo prebuild --clean` (if using prebuild)
   - Rebuild the app

4. **Check plugin order**:
   - The plugin should run AFTER other plugins (like expo-media-library)
   - Order in plugins array matters - put it near the end

## Alternative: Check Built Manifest Directly

After building, check the actual manifest file:

```bash
# For Expo prebuild projects
cat android/app/src/main/AndroidManifest.xml | grep -i "READ_MEDIA"

# Or search all manifest files
find android -name "AndroidManifest.xml" -exec grep -l "READ_MEDIA" {} \;
```

## Using Android Studio

1. Open the APK/AAB in Android Studio
2. Go to `Build` → `Analyze APK`
3. Select your APK/AAB
4. Open `AndroidManifest.xml`
5. Search for "READ_MEDIA"

## Troubleshooting

### Plugin Not Running
- Make sure the plugin file exists: `plugins/remove-media-permissions.js`
- Check for syntax errors in the plugin
- Verify `@expo/config-plugins` is installed

### Permissions in SDK-Specific Nodes
- The updated plugin should catch these
- Check build logs to confirm plugin execution
- Verify the plugin is checking all `uses-permission*` variations

### Google Play Still Rejecting
- Make sure you're submitting a NEW build (not an old one)
- Check the version code has incremented
- Wait for Google Play to re-scan (can take a few hours)
- Double-check the manifest in the actual uploaded AAB

