const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

/**
 * Config plugin to fix async-storage namespace issue
 * async-storage's config.gradle needs the app package name/namespace to be available
 * The error "Cannot invoke String.length() because prefix is null" occurs when
 * async-storage can't find the namespace in the app's build.gradle
 * 
 * This plugin ensures the namespace is set both in build.gradle and as a gradle property
 */
const withFixAsyncStorageNamespace = (config) => {
  // Get the package name from config
  const packageName = config.android?.package || 'com.patjfree.xlpostcards';
  
  // Set namespace as a gradle property so async-storage can read it early
  config = withGradleProperties(config, (config) => {
    // Add namespace as a gradle property
    config.modResults.push({
      type: 'property',
      key: 'android.namespace',
      value: packageName,
    });
    return config;
  });

  // Ensure namespace is set in app/build.gradle before async-storage config is evaluated
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Ensure namespace is set as the FIRST line in the android block
      // This is critical - async-storage's config.gradle reads it during project evaluation
      if (!config.modResults.contents.includes('namespace ')) {
        // Find the android block and add namespace as the very first line
        config.modResults.contents = config.modResults.contents.replace(
          /(android\s*\{)/,
          (match) => {
            return match + `\n    namespace '${packageName}'`;
          }
        );
      } else {
        // If namespace exists but might be null or in wrong position, fix it
        // Remove any existing namespace lines that might be problematic
        config.modResults.contents = config.modResults.contents.replace(
          /^\s*namespace\s+.*$/gm,
          ''
        );
        // Then add it at the start of android block
        config.modResults.contents = config.modResults.contents.replace(
          /(android\s*\{)/,
          (match) => {
            return match + `\n    namespace '${packageName}'`;
          }
        );
      }
      
      console.log(`[FIX-ASYNC-STORAGE-NAMESPACE] Set namespace to '${packageName}' in build.gradle and gradle.properties`);
    }
    return config;
  });

  return config;
};

module.exports = withFixAsyncStorageNamespace;

