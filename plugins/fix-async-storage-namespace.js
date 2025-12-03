const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Config plugin to fix async-storage namespace issue
 * async-storage's config.gradle needs the app package name/namespace to be available
 * The error "Cannot invoke String.length() because prefix is null" occurs when
 * async-storage can't find the namespace in the app's build.gradle
 * 
 * This plugin ensures the namespace is set in the app's build.gradle BEFORE
 * async-storage's config.gradle is evaluated during the "Configure project" phase
 */
const withFixAsyncStorageNamespace = (config) => {
  // Get the package name from config
  // IMPORTANT: Use the base package name (not .dev/.preview variants) for namespace
  // async-storage needs a consistent namespace, and the base package works for all variants
  // The actual applicationId can vary, but namespace should be consistent
  const basePackageName = 'com.patjfree.xlpostcards';
  // Try to get from config, but fall back to base package
  const packageName = (config.android?.package && !config.android.package.includes('.dev') && !config.android.package.includes('.preview'))
    ? config.android.package
    : basePackageName;
  
  // CRITICAL: Set namespace in app/build.gradle BEFORE async-storage config is evaluated
  // This must be done in withAppBuildGradle, which runs during the prebuild phase
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Remove any existing namespace declarations that might be problematic
      // This ensures we start clean
      config.modResults.contents = config.modResults.contents.replace(
        /^\s*namespace\s+.*$/gm,
        ''
      );
      
      // Ensure namespace is set as the VERY FIRST line in the android block
      // This is critical - async-storage's config.gradle reads it during project evaluation
      // and if it's not there or is null, it fails with "prefix is null"
      const androidBlockPattern = /(android\s*\{)/;
      if (androidBlockPattern.test(config.modResults.contents)) {
        // Insert namespace immediately after android { with proper indentation
        config.modResults.contents = config.modResults.contents.replace(
          androidBlockPattern,
          (match) => {
            // Check if namespace is already there (shouldn't be after the replace above, but double-check)
            const matchIndex = config.modResults.contents.indexOf(match);
            const afterAndroid = config.modResults.contents.substring(
              matchIndex + match.length,
              matchIndex + match.length + 50 // Check first 50 chars after android {
            );
            if (!afterAndroid.includes('namespace')) {
              return match + `\n    namespace '${packageName}'`;
            }
            return match;
          }
        );
      } else {
        // If android block doesn't exist, this is a problem - log warning
        console.warn('[FIX-ASYNC-STORAGE-NAMESPACE] WARNING: android block not found in build.gradle');
      }
      
      console.log(`[FIX-ASYNC-STORAGE-NAMESPACE] Set namespace to '${packageName}' in app/build.gradle`);
    }
    return config;
  });

  return config;
};

module.exports = withFixAsyncStorageNamespace;
