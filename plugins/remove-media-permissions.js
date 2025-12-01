/**
 * Config plugin to explicitly remove READ_MEDIA_IMAGES and READ_MEDIA_VIDEO permissions
 * from AndroidManifest.xml to comply with Google Play policy.
 * 
 * This plugin checks ALL uses-permission* nodes including SDK-specific ones like
 * uses-permission-sdk-33, as libraries may add permissions in various locations.
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

    if (!manifest) return config;

    // Top-level uses-permission nodes (including SDK-specific like uses-permission-sdk-33)
    const permissionKeys = Object.keys(manifest).filter((key) =>
      key.startsWith('uses-permission')
    );

    permissionKeys.forEach((key) => {
      manifest[key] = stripPermissionsArray(manifest[key]);
    });

    // Application / activity-level uses-permission nodes (comprehensive pass)
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

    console.log(
      '[REMOVE-MEDIA-PERMISSIONS] Stripped media read permissions from all uses-permission* nodes in AndroidManifest.xml'
    );

    return config;
  });
};

module.exports = withRemoveMediaPermissions;

