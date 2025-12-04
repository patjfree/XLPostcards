# NDK 27.1 Approach (Discord Suggestion)

## Problem
EAS builds are still using NDK r26 despite configuring r28. Google Play is rejecting the app for 16 KB page size support.

## Discord Suggestion
A developer on Expo Developers Discord fixed this by:
- Upgrading Expo 52 → 54
- Upgrading React Native 0.76.9 → 0.81.5
- Upgrading native packages (reanimated, etc.)
- **EAS build used NDK 27.1.***

## Our Approach: Try NDK 27.1 First

Instead of immediately doing a major upgrade (which could break things), we're trying **NDK 27.1.10909125** first, as suggested in Discord.

### Changes Made

1. **Updated NDK to 27.1.10909125** in:
   - `app.config.js` (expo-build-properties)
   - `android/gradle.properties`
   - `android/build.gradle`
   - `android/app/build.gradle`
   - `eas.json` (added `"ndk": "27.1.10909125"` to production profile)
   - `eas-hooks/pre-build.sh` (installs NDK 27.1)

2. **Why 27.1 instead of 28?**
   - Discord developer said NDK 27.1.* worked for them
   - They were on Expo 52/RN 0.76.9 (same as us)
   - NDK 27.1 supports 16 KB page sizes with proper configuration
   - Less risky than a major Expo/RN upgrade

## Next Steps

### 1. Rebuild with NDK 27.1
```bash
eas build --platform android --profile production --clear-cache
```

### 2. Check Build Logs
Look for:
```
Installing NDK (Side by side) 27.1.10909125
```
NOT:
```
Installing NDK (Side by side) 26.1.10909125
```

### 3. If NDK 27.1 Works
- ✅ Submit to Google Play
- ✅ Problem solved without major upgrade

### 4. If NDK 27.1 Still Doesn't Work

If Google Play still rejects after NDK 27.1, we have two options:

#### Option A: Major Upgrade (Discord's Full Solution)
Upgrade to:
- **Expo SDK 54**
- **React Native 0.81.5**
- **Latest native packages** (reanimated, gesture-handler, etc.)

**Pros:**
- Latest features and bug fixes
- Better 16 KB support out of the box
- Future-proof

**Cons:**
- **Major breaking changes** - could break existing code
- Requires testing all features
- May need to update many dependencies
- Time-consuming migration

**Migration Steps:**
1. Follow [Expo SDK 54 upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
2. Update React Native to 0.81.5
3. Update all native packages:
   ```bash
   npx expo install --fix
   ```
4. Test thoroughly
5. Rebuild with NDK 27.1 (should work automatically)

#### Option B: Check Individual Packages
Some packages might be forcing NDK r26. Check:
- `react-native-reanimated` - update to latest compatible
- `react-native-gesture-handler` - update to latest
- `@stripe/stripe-react-native` - check for updates
- Other native packages

## Current Package Versions

- **Expo**: ~52.0.47
- **React Native**: 0.76.9
- **react-native-reanimated**: ~3.17.5
- **react-native-gesture-handler**: ~2.20.2

These are already relatively recent. The issue is likely the NDK version, not the packages themselves.

## Why This Should Work

- **NDK 27.1** supports 16 KB page sizes
- **EAS build** should respect the NDK version in `eas.json`
- **Pre-build hook** ensures NDK 27.1 is installed
- **Multiple configuration points** ensure NDK 27.1 is used

## Verification

After rebuilding, verify:
1. ✅ Build logs show NDK 27.1.10909125
2. ✅ `zipalign` check passes (already passing)
3. ✅ Submit to Google Play
4. ✅ No rejection for 16 KB page size

## If Still Rejected

If Google Play still rejects after NDK 27.1:
1. **Wait 24-48 hours** - Google Play may cache scan results
2. **Check build logs** - confirm NDK 27.1 was actually used
3. **Consider major upgrade** - Expo 54/RN 0.81.5 with NDK 27.1
4. **Contact Expo support** - if EAS isn't respecting NDK version

