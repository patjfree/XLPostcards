/**
 * Config plugin to explicitly remove READ_MEDIA_IMAGES and READ_MEDIA_VIDEO permissions
 * from AndroidManifest.xml to comply with Google Play policy
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const withRemoveMediaPermissions = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest) {
      return config;
    }

    // Remove READ_MEDIA_IMAGES permission
    if (manifest['uses-permission']) {
      manifest['uses-permission'] = manifest['uses-permission'].filter(
        (permission) => {
          const name = permission.$['android:name'];
          return (
            name !== 'android.permission.READ_MEDIA_IMAGES' &&
            name !== 'android.permission.READ_MEDIA_VIDEO'
          );
        }
      );
    }

    // Also check application/activity level permissions
    if (manifest.application && Array.isArray(manifest.application)) {
      manifest.application.forEach((app) => {
        if (app.activity && Array.isArray(app.activity)) {
          app.activity.forEach((activity) => {
            if (activity['uses-permission']) {
              activity['uses-permission'] = activity['uses-permission'].filter(
                (permission) => {
                  const name = permission.$['android:name'];
                  return (
                    name !== 'android.permission.READ_MEDIA_IMAGES' &&
                    name !== 'android.permission.READ_MEDIA_VIDEO'
                  );
                }
              );
            }
          });
        }
      });
    }

    console.log('[REMOVE-MEDIA-PERMISSIONS] Removed READ_MEDIA_IMAGES and READ_MEDIA_VIDEO from AndroidManifest.xml');
    
    return config;
  });
};

module.exports = withRemoveMediaPermissions;

