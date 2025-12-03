#!/usr/bin/env node

/**
 * Post-install script to patch async-storage's config.gradle
 * This runs after npm install to ensure the patch is applied
 */

const fs = require('fs');
const path = require('path');

const asyncStorageConfigPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native-async-storage',
  'async-storage',
  'android',
  'config.gradle'
);

if (!fs.existsSync(asyncStorageConfigPath)) {
  console.log('[PATCH-ASYNC-STORAGE] async-storage config.gradle not found, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(asyncStorageConfigPath, 'utf8');
const originalContent = content;

// The error "Cannot invoke String.length() because prefix is null" occurs
// when async-storage tries to read the namespace from the app module but it's null.
// We need to add null safety checks.

// Strategy 1: Find where prefix is defined and add a default value
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
content = content.replace(
  /prefix\.length\(\)/g,
  '(prefix ? prefix.length() : 0)'
);

// Strategy 3: If there's a line that extracts namespace and might be null, add fallback
if (content.includes('namespace') && !content.includes("namespace ?: 'com.patjfree.xlpostcards'")) {
  // Add fallback for namespace reads that might be null
  content = content.replace(
    /(project\(['"]:app['"]\)\.android\.namespace)/g,
    "$1 ?: 'com.patjfree.xlpostcards'"
  );
}

if (content !== originalContent) {
  fs.writeFileSync(asyncStorageConfigPath, content, 'utf8');
  console.log('[PATCH-ASYNC-STORAGE] ✅ Successfully patched async-storage config.gradle');
  console.log('[PATCH-ASYNC-STORAGE] Added null safety checks for prefix/namespace');
} else {
  console.log('[PATCH-ASYNC-STORAGE] No changes needed (already patched or no issues found)');
}

