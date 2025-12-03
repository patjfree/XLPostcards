const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to patch async-storage's config.gradle to handle null namespace
 * This patches the file directly during prebuild to prevent the "prefix is null" error
 */
const withPatchAsyncStorageConfig = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const asyncStorageConfigPath = path.join(
        config.modRequest.platformProjectRoot,
        '..',
        'node_modules',
        '@react-native-async-storage',
        'async-storage',
        'android',
        'config.gradle'
      );

      // Resolve the actual path
      const resolvedPath = path.resolve(asyncStorageConfigPath);
      
      if (fs.existsSync(resolvedPath)) {
        let content = fs.readFileSync(resolvedPath, 'utf8');
        const originalContent = content;
        
        // The error occurs when async-storage tries to call prefix.length() but prefix is null
        // We need to find where this happens and add null safety
        
        // Look for patterns that might cause the issue
        // Common pattern: def prefix = something; prefix.length()
        // We'll add null safety checks
        
        // Replace any direct .length() calls on prefix with safe null checks
        content = content.replace(
          /(\w+)\.length\(\)/g,
          (match, varName) => {
            // Only replace if it's likely to be the prefix variable
            if (varName === 'prefix' || varName.includes('prefix')) {
              return `(${varName} ? ${varName}.length() : 0)`;
            }
            return match;
          }
        );
        
        // Also add a default value if namespace/prefix is being read from app module
        // Look for patterns like: def prefix = project(':app').android.namespace
        if (content.includes('namespace') && !content.includes('namespace ?:')) {
          // Add fallback for namespace reads
          content = content.replace(
            /def\s+(\w+)\s*=\s*([^;]+\.namespace[^;]*);/g,
            (match, varName, value) => {
              return `def ${varName} = ${value} ?: 'com.patjfree.xlpostcards';`;
            }
          );
        }
        
        if (content !== originalContent) {
          fs.writeFileSync(resolvedPath, content, 'utf8');
          console.log('[PATCH-ASYNC-STORAGE-CONFIG] Patched async-storage config.gradle to handle null namespace');
        } else {
          console.log('[PATCH-ASYNC-STORAGE-CONFIG] No changes needed to async-storage config.gradle');
        }
      } else {
        console.warn(`[PATCH-ASYNC-STORAGE-CONFIG] Could not find async-storage config.gradle at: ${resolvedPath}`);
      }
      
      return config;
    }
  ]);
};

module.exports = withPatchAsyncStorageConfig;
