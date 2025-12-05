const { withProjectBuildGradle } = require('expo/config-plugins');

const withKotlinVersionFix = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Force Kotlin version to 2.0.20 by updating the buildscript dependencies
      // This ensures kotlin-gradle-plugin matches our kotlinVersion setting
      const kotlinVersionFix = `
    // Force Kotlin version to 2.0.20 to match KSP version
    buildscript {
        ext {
            kotlinVersion = "2.0.20"
        }
        dependencies {
            classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:\$kotlinVersion"
        }
    }`;

      // Check if buildscript block already exists
      if (config.modResults.contents.includes('buildscript {')) {
        // Update existing kotlinVersion in buildscript
        config.modResults.contents = config.modResults.contents.replace(
          /(buildscript\s*\{[^}]*ext\s*\{[^}]*?)kotlinVersion\s*=\s*["'][^"']+["']/,
          '$1kotlinVersion = "2.0.20"'
        );
        
        // Ensure kotlin-gradle-plugin uses the version
        if (!config.modResults.contents.includes('kotlin-gradle-plugin')) {
          // Add it to dependencies if missing
          config.modResults.contents = config.modResults.contents.replace(
            /(buildscript\s*\{[^}]*dependencies\s*\{)/,
            '$1\n            classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion"'
          );
        } else {
          // Update existing kotlin-gradle-plugin version
          config.modResults.contents = config.modResults.contents.replace(
            /classpath\s+["']org\.jetbrains\.kotlin:kotlin-gradle-plugin:[^"']+["']/,
            'classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion"'
          );
        }
      } else {
        // Insert buildscript block before allprojects
        config.modResults.contents = config.modResults.contents.replace(
          /(allprojects\s*\{)/,
          kotlinVersionFix + '\n\n$1'
        );
      }
    }
    return config;
  });
};

module.exports = withKotlinVersionFix;

