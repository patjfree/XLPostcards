/**
 * Config plugin to explicitly remove READ_MEDIA_IMAGES and READ_MEDIA_VIDEO permissions
 * from AndroidManifest.xml to comply with Google Play policy.
 * 
 * Uses two approaches:
 * 1. Direct removal from manifest nodes (for plugins that run before us)
 * 2. tools:node="remove" declarations (for manifest merge level, catches everything)
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSIONS_TO_REMOVE = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_EXTERNAL_STORAGE', // Extra safety - legacy permission
];

function stripPermissionsArray(array) {
  if (!Array.isArray(array)) return array;
  return array.filter((permission) => {
    const name = permission.$?.['android:name'];
    if (!name) return true;
    return !PERMISSIONS_TO_REMOVE.includes(name);
  });
}

const withRemoveMediaPermissions = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest) {
      console.log('[REMOVE-MEDIA-PERMISSIONS] No manifest found, skipping');
      return config;
    }

    // Ensure tools namespace is declared
    if (!androidManifest.manifest) {
      androidManifest.manifest = {};
    }
    if (!androidManifest.manifest.$) {
      androidManifest.manifest.$ = {};
    }
    if (!androidManifest.manifest.$['xmlns:tools']) {
      androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    let removedCount = 0;

    // Method 1: Direct removal from existing permission nodes
    const permissionKeys = Object.keys(manifest).filter((key) =>
      key.startsWith('uses-permission')
    );

    console.log(`[REMOVE-MEDIA-PERMISSIONS] Found ${permissionKeys.length} uses-permission* nodes at top level:`, permissionKeys);

    permissionKeys.forEach((key) => {
      const beforeCount = Array.isArray(manifest[key]) ? manifest[key].length : 0;
      manifest[key] = stripPermissionsArray(manifest[key]);
      const afterCount = Array.isArray(manifest[key]) ? manifest[key].length : 0;
      const removed = beforeCount - afterCount;
      if (removed > 0) {
        console.log(`[REMOVE-MEDIA-PERMISSIONS] Removed ${removed} permission(s) from ${key}`);
        removedCount += removed;
      }
    });

    // Application / activity-level uses-permission nodes
    if (Array.isArray(manifest.application)) {
      manifest.application.forEach((app) => {
        const appKeys = Object.keys(app).filter((key) =>
          key.startsWith('uses-permission')
        );
        appKeys.forEach((key) => {
          app[key] = stripPermissionsArray(app[key]);
        });

        if (Array.isArray(app.activity)) {
          app.activity.forEach((activity) => {
            const actKeys = Object.keys(activity).filter((key) =>
              key.startsWith('uses-permission')
            );
            actKeys.forEach((key) => {
              activity[key] = stripPermissionsArray(activity[key]);
            });
          });
        }
      });
    }

    // Method 2: Add tools:node="remove" declarations for manifest merge level removal
    // This catches permissions added by dependencies during manifest merge
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    PERMISSIONS_TO_REMOVE.forEach((permissionName) => {
      // Check if removal declaration already exists
      const alreadyExists = manifest['uses-permission'].some(
        (perm) => 
          perm.$?.['android:name'] === permissionName && 
          perm.$?.['tools:node'] === 'remove'
      );

      if (!alreadyExists) {
        manifest['uses-permission'].push({
          $: {
            'android:name': permissionName,
            'tools:node': 'remove',
          },
        });
        console.log(`[REMOVE-MEDIA-PERMISSIONS] Added tools:node="remove" for ${permissionName}`);
      }
    });

    // Also add for SDK-specific nodes
    PERMISSIONS_TO_REMOVE.forEach((permissionName) => {
      // Check for uses-permission-sdk-33 (and other SDK versions)
      for (let sdk = 30; sdk <= 35; sdk++) {
        const sdkKey = `uses-permission-sdk-${sdk}`;
        if (!manifest[sdkKey]) {
          manifest[sdkKey] = [];
        }

        const alreadyExists = manifest[sdkKey].some(
          (perm) => 
            perm.$?.['android:name'] === permissionName && 
            perm.$?.['tools:node'] === 'remove'
        );

        if (!alreadyExists) {
          manifest[sdkKey].push({
            $: {
              'android:name': permissionName,
              'tools:node': 'remove',
            },
          });
          console.log(`[REMOVE-MEDIA-PERMISSIONS] Added tools:node="remove" for ${permissionName} in ${sdkKey}`);
        }
      }
    });

    console.log(
      `[REMOVE-MEDIA-PERMISSIONS] Complete. Removed ${removedCount} permission(s) directly, added tools:node="remove" declarations for manifest merge level removal.`
    );

    return config;
  });
};

module.exports = withRemoveMediaPermissions;

