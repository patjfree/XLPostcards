/**
 * Config plugin to completely remove expo-media-library from Android builds
 * This prevents Google Play from detecting the library even if permissions are removed
 */
const { withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');

const withRemoveExpoMediaLibraryAndroid = (config) => {
  // Remove expo-media-library from Android dependencies
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Remove expo-media-library dependency if present
      config.modResults.contents = config.modResults.contents.replace(
        /implementation\(['"]com\.expo\.expo-media-library:expo-media-library[^)]+\)/g,
        '// Removed expo-media-library to avoid Google Play READ_MEDIA permission detection'
      );
    }
    return config;
  });

  // Also ensure no permissions are added by expo-media-library
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest) return config;

    // Remove any expo-media-library related permissions
    const permissionKeys = Object.keys(manifest).filter((key) =>
      key.startsWith('uses-permission')
    );

    permissionKeys.forEach((key) => {
      if (Array.isArray(manifest[key])) {
        manifest[key] = manifest[key].filter((permission) => {
          const name = permission.$?.['android:name'];
          // Remove any media library related permissions
          return !name || (
            !name.includes('READ_MEDIA') &&
            !name.includes('WRITE_EXTERNAL_STORAGE') &&
            name !== 'android.permission.READ_EXTERNAL_STORAGE'
          );
        });
      }
    });

    console.log('[REMOVE-EXPO-MEDIA-LIBRARY-ANDROID] Removed expo-media-library from Android build');
    return config;
  });

  return config;
};

module.exports = withRemoveExpoMediaLibraryAndroid;

