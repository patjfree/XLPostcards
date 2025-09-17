const { withProjectBuildGradle } = require('@expo/config-plugins');

const withStripeAndroidFix = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Add dependency resolution strategy to force stable Stripe versions
      const resolutionStrategy = `
    // Force stable versions for Stripe dependencies
    configurations.all {
        resolutionStrategy {
            eachDependency { details ->
                if (details.requested.group == 'com.stripe') {
                    if (details.requested.name == 'stripe-android') {
                        details.useVersion '20.48.0'
                        details.because 'Force compatible version with Kotlin 2.0'
                    }
                    if (details.requested.name == 'financial-connections') {
                        details.useVersion '20.48.0'
                        details.because 'Force compatible version with Kotlin 2.0'
                    }
                }
            }
        }
    }`;

      // Insert the resolution strategy into the allprojects block
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*\{([^}]*)\}/,
        (match, content) => {
          if (!content.includes('configurations.all')) {
            return match.replace('}', resolutionStrategy + '\n}');
          }
          return match;
        }
      );
    }
    return config;
  });
};

module.exports = withStripeAndroidFix;