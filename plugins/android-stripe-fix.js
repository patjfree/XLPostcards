const { withProjectBuildGradle } = require('@expo/config-plugins');

const withStripeAndroidFix = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Add dependency resolution strategy to force stable Stripe and Compose versions
      const resolutionStrategy = `
    // Force stable versions for Stripe dependencies and Jetpack Compose
    configurations.all {
        resolutionStrategy {
            eachDependency { details ->
                // Let Stripe React Native 0.38.6 resolve its own stripe-android version
                // (removed version forcing to allow it to use APIs it needs)
                // Force ALL Jetpack Compose versions to fix NoSuchMethodError
                // Stripe Payment Sheet requires Compose 1.5.0+ but React Native 0.79.6 bundles older version
                // Force all Compose dependencies to 1.5.4 to ensure compatibility
                if (details.requested.group.startsWith('androidx.compose.')) {
                    details.useVersion '1.5.4'
                    details.because 'Fix Stripe Payment Sheet Compose compatibility (NoSuchMethodError: performImeAction$default)'
                }
            }
        }
    }`;

      // Insert the resolution strategy into the allprojects block
      // If configurations.all already exists, merge our rules into it
      if (config.modResults.contents.includes('configurations.all')) {
        // Find the eachDependency block and add our rules
        const eachDependencyPattern = /(eachDependency\s*\{[^}]*details\s*->)/;
        if (config.modResults.contents.match(eachDependencyPattern)) {
          // Merge into existing eachDependency block
          config.modResults.contents = config.modResults.contents.replace(
            /(eachDependency\s*\{[^}]*details\s*->)/,
            (match) => {
              // Check if our rules are already there
              if (!config.modResults.contents.includes('androidx.compose.')) {
                return match + '\n                // Force ALL Jetpack Compose versions to fix NoSuchMethodError\n                if (details.requested.group.startsWith(\'androidx.compose.\')) {\n                    details.useVersion \'1.5.4\'\n                    details.because \'Fix Stripe Payment Sheet Compose compatibility (NoSuchMethodError: performImeAction$default)\'\n                }';
              }
              return match;
            }
          );
        }
      } else {
        // Insert new resolution strategy
        config.modResults.contents = config.modResults.contents.replace(
          /allprojects\s*\{([^}]*)\}/,
          (match, content) => {
            return match.replace('}', resolutionStrategy + '\n}');
          }
        );
      }
    }
    return config;
  });
};

module.exports = withStripeAndroidFix;