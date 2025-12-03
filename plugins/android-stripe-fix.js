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
                // Force Stripe Android SDK versions
                if (details.requested.group == 'com.stripe') {
                    if (details.requested.name == 'stripe-android') {
                        // Stripe React Native 0.38.6 works with stripe-android 20.x
                        // Use a stable version compatible with Kotlin 2.0.21
                        details.useVersion '20.48.0'
                        details.because 'Compatible with Stripe React Native 0.38.6 and Kotlin 2.0.21'
                    }
                    if (details.requested.name == 'financial-connections') {
                        details.useVersion '20.48.0'
                        details.because 'Match stripe-android version'
                    }
                    if (details.requested.name == 'paymentsheet') {
                        details.useVersion '20.48.0'
                        details.because 'Match stripe-android version'
                    }
                }
                // Force Jetpack Compose versions to fix NoSuchMethodError
                // Stripe Payment Sheet requires Compose 1.5.0+ but React Native 0.79.6 bundles older version
                if (details.requested.group == 'androidx.compose.ui') {
                    if (details.requested.name == 'ui' || details.requested.name == 'ui-util') {
                        details.useVersion '1.5.4'
                        details.because 'Fix Stripe Payment Sheet Compose compatibility (NoSuchMethodError)'
                    }
                }
                if (details.requested.group == 'androidx.compose.foundation') {
                    if (details.requested.name == 'foundation') {
                        details.useVersion '1.5.4'
                        details.because 'Fix Stripe Payment Sheet Compose compatibility'
                    }
                }
                if (details.requested.group == 'androidx.compose.runtime') {
                    if (details.requested.name == 'runtime') {
                        details.useVersion '1.5.4'
                        details.because 'Fix Stripe Payment Sheet Compose compatibility'
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