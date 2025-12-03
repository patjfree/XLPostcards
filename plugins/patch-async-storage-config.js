const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to patch async-storage's config.gradle to handle null namespace
 * This patches the file directly during prebuild to prevent the "prefix is null" error
 * 
 * The error occurs at line 82 of async-storage's config.gradle when it tries to
 * call prefix.length() but prefix is null because the namespace isn't set yet.
 */
const withPatchAsyncStorageConfig = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      // Try multiple possible paths for async-storage config.gradle
      const possiblePaths = [
        // Path relative to platform project root
        path.join(
          config.modRequest.platformProjectRoot,
          '..',
          'node_modules',
          '@react-native-async-storage',
          'async-storage',
          'android',
          'config.gradle'
        ),
        // Path from project root
        path.join(
          process.cwd(),
          'node_modules',
          '@react-native-async-storage',
          'async-storage',
          'android',
          'config.gradle'
        ),
        // Absolute path resolution
        path.resolve(
          config.modRequest.platformProjectRoot,
          '..',
          'node_modules',
          '@react-native-async-storage',
          'async-storage',
          'android',
          'config.gradle'
        )
      ];

      let asyncStorageConfigPath = null;
      for (const possiblePath of possiblePaths) {
        const resolvedPath = path.resolve(possiblePath);
        if (fs.existsSync(resolvedPath)) {
          asyncStorageConfigPath = resolvedPath;
          break;
        }
      }
      
      if (!asyncStorageConfigPath) {
        console.warn('[PATCH-ASYNC-STORAGE-CONFIG] Could not find async-storage config.gradle. Tried paths:', possiblePaths);
        return config;
      }
      
      let content = fs.readFileSync(asyncStorageConfigPath, 'utf8');
      const originalContent = content;
      
      // The error "Cannot invoke String.length() because prefix is null" occurs
      // when async-storage tries to read the namespace from the app module but it's null.
      // We need to add null safety checks.
      
      // Strategy 1: Find where prefix is defined and add a default value
      // Look for patterns like: def prefix = project(':app').android.namespace
      // or: def prefix = something that might be null
      if (content.includes('prefix') && !content.includes('prefix ?:')) {
        // Add null coalescing operator to prefix definitions
        content = content.replace(
          /(def\s+prefix\s*=\s*)([^;]+)(;)/g,
          (match, defPart, valuePart, semicolon) => {
            // If the value doesn't already have a null check, add one
            if (!valuePart.includes('?:') && !valuePart.includes('?.')) {
              return `${defPart}${valuePart} ?: 'com.patjfree.xlpostcards'${semicolon}`;
            }
            return match;
          }
        );
      }
      
      // Strategy 2: Replace any prefix.length() calls with safe null checks
      // This is a defensive measure in case prefix is still null
      content = content.replace(
        /prefix\.length\(\)/g,
        '(prefix ? prefix.length() : 0)'
      );
      
      // Strategy 3: If there's a line that extracts namespace and might be null, add fallback
      // Look for patterns that read namespace from the app module
      if (content.includes('namespace') && !content.includes("namespace ?: 'com.patjfree.xlpostcards'")) {
        // Add fallback for namespace reads that might be null
        content = content.replace(
          /(project\(['"]:app['"]\)\.android\.namespace)/g,
          "$1 ?: 'com.patjfree.xlpostcards'"
        );
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(asyncStorageConfigPath, content, 'utf8');
        console.log('[PATCH-ASYNC-STORAGE-CONFIG] Successfully patched async-storage config.gradle');
        console.log('[PATCH-ASYNC-STORAGE-CONFIG] Added null safety checks for prefix/namespace');
      } else {
        console.log('[PATCH-ASYNC-STORAGE-CONFIG] No changes needed to async-storage config.gradle (already patched or no issues found)');
      }
      
      return config;
    }
  ]);
};

module.exports = withPatchAsyncStorageConfig;
