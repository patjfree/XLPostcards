# Android Media Permissions Fix

## Issue
Google Play rejected the app because it was requesting `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO` permissions, which are restricted for apps that only need one-time or infrequent access to media files.

## Solution
We've implemented a multi-layered approach to ensure these permissions are NOT requested:

### 1. Blocked Permissions in Build Properties
In `app.config.js`, we use `expo-build-properties` to block these permissions:
```javascript
blockedPermissions: [
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO"
]
```

### 2. Custom Config Plugin (Hardened)
Created `plugins/remove-media-permissions.js` that explicitly removes these permissions from **ALL** `uses-permission*` nodes in AndroidManifest.xml, including:
- Standard `uses-permission` nodes
- SDK-specific nodes like `uses-permission-sdk-33`
- Application-level permission nodes
- Activity-level permission nodes

This comprehensive approach ensures that even if a plugin (like `expo-media-library`) tries to add them in any location, they get stripped out.

### 3. Android Photo Picker
- **expo-image-picker**: On Android 11+ (API 30+), it automatically uses the Android Photo Picker, which doesn't require any permissions
- **Code**: We explicitly do NOT call `requestMediaLibraryPermissionsAsync()` in our image picker code
- **Comments**: Added clear comments in `MultiImagePicker.tsx` and `TemplatePickerModal.tsx` explaining why we don't request permissions

### 4. expo-media-library Configuration
- `isAccessMediaLocationEnabled: false` - Disables location access
- Only used for **saving** images (not reading), which doesn't require READ_MEDIA permissions on Android 10+

## Verification Steps

### Before Building
1. Check that `plugins/remove-media-permissions.js` is in the plugins array in `app.config.js`
2. Verify `blockedPermissions` includes both READ_MEDIA permissions
3. Ensure no code calls `requestMediaLibraryPermissionsAsync()` on Android

### After Building
1. Extract the APK/AAB
2. Use `aapt dump permissions <apk>` or check AndroidManifest.xml
3. Verify that `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO` are NOT present

### Testing
1. Test image picking on Android 11+ device - should use Photo Picker (no permission prompt)
2. Test image picking on Android 10 device - should still work (legacy picker)
3. Test saving postcards - should work without READ permissions

## Code Locations

### Image Picking (No Permissions Requested)
- `app/components/MultiImagePicker.tsx` - Lines 196-208 (Android path)
- `app/components/TemplatePickerModal.tsx` - Lines 183-194 (Android path)

### Image Saving (iOS Only Permission Request)
- `app/postcard-preview.tsx` - Lines 288-295 (iOS only, Android skips permission request)

## Notes
- Android Photo Picker is the system picker that doesn't require permissions
- On Android 10+ (API 29+), saving to MediaStore works via scoped storage without READ permissions
- The custom plugin runs AFTER all other plugins to ensure READ_MEDIA permissions are removed even if added by dependencies
- The plugin now checks **all** `uses-permission*` variations including SDK-specific ones (e.g., `uses-permission-sdk-33`) to catch permissions added by libraries in any location
- Also removes `READ_EXTERNAL_STORAGE` as an extra safety measure (legacy permission)

