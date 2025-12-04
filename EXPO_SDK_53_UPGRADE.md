# Expo SDK 53 Upgrade Required for 16 KB Page Size Support

## Root Cause Identified

According to [Expo's official documentation](https://github.com/expo/fyi/blob/main/android-16kb-page-sizes.md):

> **React Native supports 16KB page sizes since version 0.77.** You need to upgrade to an Expo SDK that includes React Native 0.77, which means **Expo SDK 53**.

### Current Status
- ❌ **Expo SDK 52** (`expo@~52.0.47`)
- ❌ **React Native 0.76.9** (does NOT support 16 KB page sizes)
- ❌ **Cannot support 16 KB page sizes** regardless of NDK version

### Required Status
- ✅ **Expo SDK 53+** (`expo@>=53.0.14`)
- ✅ **React Native 0.77+** (supports 16 KB page sizes)
- ✅ **16 KB page size support** built-in

## Why NDK Version Alone Won't Work

Even with NDK 27.1 or 28, if React Native 0.76.9 doesn't support 16 KB page sizes, the native libraries (`libreactnative.so`, `libhermes.so`, etc.) won't be properly aligned. The NDK version is necessary but not sufficient - you need React Native 0.77+.

## Upgrade Steps

### 1. Upgrade Expo SDK

```bash
npx expo install expo@latest
```

This will upgrade to Expo SDK 53 (latest stable).

### 2. Fix All Dependencies

```bash
npx expo install --fix
```

This command will:
- Update all Expo packages to SDK 53 compatible versions
- Update React Native to 0.77+ (included in SDK 53)
- Update all native dependencies to compatible versions

### 3. Update Other Dependencies

Some packages may need manual updates. Check for:
- `jest-expo` - should be `~53.0.0` (currently `~52.0.6`)
- `eslint-config-expo` - should be compatible with SDK 53

### 4. Check for Breaking Changes

Review the [Expo SDK 53 changelog](https://expo.dev/changelog/sdk-53) for breaking changes that might affect your app.

### 5. Rebuild

After upgrading:
```bash
# Clear cache and rebuild
eas build --platform android --profile production --clear-cache
```

## Expected Changes

After upgrade, you should see:
- `expo@~53.0.14` or newer
- `react-native@0.77.x` or newer
- All Expo packages updated to SDK 53 versions
- NDK 27.1 or 28 (our previous changes are still good)

## Verification

After building, verify:
1. ✅ Build logs show React Native 0.77+
2. ✅ Build logs show NDK 27.1 or 28
3. ✅ `zipalign` check passes
4. ✅ Google Play accepts the build

## Important Notes

- **Expo SDK 53** includes React Native 0.77+ which has built-in 16 KB page size support
- **NDK 27.1 or 28** is still recommended (our previous configuration)
- **expo@53.0.14+** includes the fixes for 16 KB page size support
- The upgrade is **required** - there's no workaround for SDK 52

## If Upgrade Causes Issues

If you encounter breaking changes:
1. Review the [Expo SDK 53 changelog](https://expo.dev/changelog/sdk-53)
2. Check [Expo upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
3. Test thoroughly before submitting to Google Play
4. Consider requesting a deadline extension from Google Play if needed (deadline: May 31, 2026)

## References

- [Expo Android 16KB Page Sizes Guide](https://github.com/expo/fyi/blob/main/android-16kb-page-sizes.md)
- [Expo SDK 53 Changelog](https://expo.dev/changelog/sdk-53)
- [React Native 0.77 Release Notes](https://reactnative.dev/blog/2025/01/21/version-0.77#android-version-15-support--16kb-page-support)

