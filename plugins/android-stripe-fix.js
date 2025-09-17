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
                        details.useVersion '21.26.0'
                        details.because 'Force stable version to avoid snapshots repository'
                    }
                    if (details.requested.name == 'financial-connections') {
                        details.useVersion '20.48.0'
                        details.because 'Force stable version to avoid snapshots repository'
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