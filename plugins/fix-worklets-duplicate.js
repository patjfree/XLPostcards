const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Config plugin to fix duplicate classes between react-native-reanimated and react-native-worklets
 * Since react-native-reanimated already includes react-native-worklets, we exclude the standalone
 * react-native-worklets module from the Android build to prevent duplicate class errors
 */
const withFixWorkletsDuplicate = (config) => {
  // Exclude react-native-worklets from being compiled as a separate module
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Add configuration to exclude react-native-worklets module
      // This prevents it from being compiled separately since react-native-reanimated includes it
      const excludeWorklets = `
    // Exclude react-native-worklets from autolinking since react-native-reanimated includes it
    // This prevents duplicate class errors during DEX merging
    configurations.all {
        exclude group: 'com.swmansion.worklets', module: 'react-native-worklets'
    }`;

      // Add to allprojects block if it exists
      if (config.modResults.contents.includes('allprojects')) {
        if (!config.modResults.contents.includes('exclude group: \'com.swmansion.worklets\'')) {
          config.modResults.contents = config.modResults.contents.replace(
            /(allprojects\s*\{)/,
            (match) => {
              return match + excludeWorklets + '\n    ';
            }
          );
        }
      } else {
        // If allprojects doesn't exist, add it
        config.modResults.contents = excludeWorklets + '\n\n' + config.modResults.contents;
      }
    }
    return config;
  });

  // Also add packaging options to handle any remaining duplicates
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Add packaging options to pick first for duplicate worklets classes
      const packagingOptions = `
    packagingOptions {
        // Pick first for duplicate worklets classes (react-native-reanimated includes them)
        pickFirst '**/com/swmansion/worklets/**'
        pickFirst '**/libc++_shared.so'
        pickFirst '**/libfbjni.so'
    }`;

      // Add packagingOptions to android block
      if (!config.modResults.contents.includes('packagingOptions')) {
        config.modResults.contents = config.modResults.contents.replace(
          /(android\s*\{)/,
          (match) => {
            return match + packagingOptions + '\n    ';
          }
        );
      }
    }
    return config;
  });

  return config;
};

module.exports = withFixWorkletsDuplicate;

