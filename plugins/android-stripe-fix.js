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
                        // Stripe React Native 0.45.0 requires payment element support
                        // Payment elements were added in stripe-android 21.0.0+
                        // Try 21.0.0 first, fallback to latest if needed
                        details.useVersion '21.0.0'
                        details.because 'Stripe React Native 0.45.0 requires payment element support (stripe-android 21.0.0+)'
                    }
                    if (details.requested.name == 'financial-connections') {
                        details.useVersion '21.0.0'
                        details.because 'Match stripe-android version'
                    }
                    if (details.requested.name == 'paymentsheet') {
                        details.useVersion '21.0.0'
                        details.because 'Match stripe-android version'
                    }
                    // Payment element is a separate module in newer versions
                    if (details.requested.name == 'paymentelement') {
                        details.useVersion '21.0.0'
                        details.because 'Required for payment element support'
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