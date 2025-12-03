const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Config plugin to fix async-storage namespace issue
 * async-storage's config.gradle needs the app package name to be available
 * This ensures the namespace is properly set before async-storage config is evaluated
 */
const withFixAsyncStorageNamespace = (config) => {
  // Ensure namespace is set in app/build.gradle before async-storage config is evaluated
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const packageName = config.android?.package || 'com.patjfree.xlpostcards';
      
      // Ensure namespace is set early in the android block
      // This must be set before async-storage's config.gradle is evaluated
      if (!config.modResults.contents.includes('namespace ')) {
        // Find the android block and add namespace right after it opens
        config.modResults.contents = config.modResults.contents.replace(
          /(android\s*\{)/,
          (match) => {
            return match + `\n    namespace '${packageName}'`;
          }
        );
      } else {
        // If namespace exists, ensure it matches the package name
        config.modResults.contents = config.modResults.contents.replace(
          /namespace\s+['"]([^'"]+)['"]/,
          `namespace '${packageName}'`
        );
      }
      
      console.log(`[FIX-ASYNC-STORAGE-NAMESPACE] Set namespace to '${packageName}'`);
    }
    return config;
  });

  return config;
};

module.exports = withFixAsyncStorageNamespace;

