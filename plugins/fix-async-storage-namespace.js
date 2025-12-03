const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Config plugin to fix async-storage namespace issue
 * async-storage's config.gradle needs the app package name/namespace to be available
 * The error "Cannot invoke String.length() because prefix is null" occurs when
 * async-storage can't find the namespace in the app's build.gradle
 */
const withFixAsyncStorageNamespace = (config) => {
  // Ensure namespace is set in app/build.gradle before async-storage config is evaluated
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Get package name from config, with fallback
      const packageName = config.android?.package || 
                         (config.modResults.contents.match(/applicationId\s+['"]([^'"]+)['"]/) || [])[1] ||
                         'com.patjfree.xlpostcards';
      
      // Ensure namespace is set early in the android block (before defaultConfig)
      // async-storage's config.gradle reads this to determine the package prefix
      if (!config.modResults.contents.includes('namespace ')) {
        // Find the android block and add namespace right after it opens, before any other config
        config.modResults.contents = config.modResults.contents.replace(
          /(android\s*\{)/,
          (match) => {
            return match + `\n    namespace '${packageName}'`;
          }
        );
      } else {
        // If namespace exists, ensure it's not null/empty and matches a valid package name
        // Replace any null or empty namespace assignments
        config.modResults.contents = config.modResults.contents.replace(
          /namespace\s+(null|['"]\s*['"])/,
          `namespace '${packageName}'`
        );
        // Also ensure existing namespace matches the package name
        config.modResults.contents = config.modResults.contents.replace(
          /namespace\s+['"]([^'"]+)['"]/,
          (match, existingNamespace) => {
            // Only replace if it looks wrong (contains .dev or .preview when it shouldn't, etc.)
            if (existingNamespace && existingNamespace.length > 0) {
              return match; // Keep existing if it's valid
            }
            return `namespace '${packageName}'`;
          }
        );
      }
      
      console.log(`[FIX-ASYNC-STORAGE-NAMESPACE] Ensured namespace is set to '${packageName}'`);
    }
    return config;
  });

  return config;
};

module.exports = withFixAsyncStorageNamespace;

