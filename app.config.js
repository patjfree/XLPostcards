import 'dotenv/config';

// ------- Profile & variant resolution -------
const PROFILE = process.env.EAS_BUILD_PROFILE || '';
const isLocalDev = !process.env.EAS_BUILD_PROFILE;

const APP_VARIANT = process.env.APP_VARIANT ||
  (PROFILE === 'production' ? 'production'
   : PROFILE === 'preview' ? 'preview'
   : PROFILE === 'development' ? 'development'
   : PROFILE === 'ios-simulator' || PROFILE.includes('simulator') ? 'development'
   : isLocalDev ? 'development'
   : 'production');

const IS_DEV = APP_VARIANT === 'development';
const IS_PREVIEW = APP_VARIANT === 'preview';
const IS_IOS_SIMULATOR = PROFILE === 'ios-simulator';
const FORCE_TEST_MODE = IS_DEV || IS_IOS_SIMULATOR || PROFILE.includes('simulator');

// ------- IDs -------
const baseId = 'com.patjfree.xlpostcards';
const getBundleIdentifier = () => {
  if (IS_DEV) return `${baseId}.dev`;
  if (IS_PREVIEW) return `${baseId}.preview`;
  return baseId;
};
const getPackageName = () => {
  if (IS_DEV) return `${baseId}.dev`;
  if (IS_PREVIEW) return `${baseId}.preview`;
  return baseId;
};

// ------- App name shown on device (optional, keep your current scheme) -------
const getAppName = () => {
  // For production builds, always use clean name
  if (PROFILE === 'production' || APP_VARIANT === 'production') return 'XLPostcards';
  if (IS_DEV && isLocalDev) return 'Simulator - Test CC OK';
  if (IS_DEV) return 'D:XLPostcards';
  if (IS_PREVIEW) return 'P:XLPostcards';
  return 'XLPostcards';
};

// ------- Exposed remote version values from EAS -------
// EAS injects these when appVersionSource=remote
const REMOTE_APP_VERSION = process.env.EAS_BUILD_VERSION;          // e.g. "2.1.18"
const REMOTE_IOS_BUILD_NUMBER = process.env.EAS_BUILD_BUILD_NUMBER; // e.g. "23"
const REMOTE_ANDROID_VERSION_CODE = process.env.EAS_BUILD_VERSION_CODE; // e.g. "61"

module.exports = {
  name: getAppName(),
  slug: "XLPostcards",

  // Use EAS remote app version when available (falls back to a string if missing)
  version: REMOTE_APP_VERSION || "2.3.8",
  runtimeVersion: { policy: "appVersion" },

  orientation: "portrait",
  icon: "./assets/images/icon1024.png",
  scheme: "XLPostcards",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  splash: {
    image: "./assets/images/icon1024.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },

  assetBundlePatterns: ["**/*"],

  ios: {
    // Always force prod bundle ID for production profile
    bundleIdentifier: baseId, // Always use com.patjfree.xlpostcards for production builds
    supportsTablet: true,
    deploymentTarget: "13.0",
    // Use EAS auto-increment for buildNumber (no manual override needed)
    buildNumber: (REMOTE_IOS_BUILD_NUMBER || process.env.EAS_BUILD_IOS_BUILD_NUMBER || "1"),
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        "XLPostcards uses your photo library so you can select a photo for the front image on your postcard.",
      ITSAppUsesNonExemptEncryption: false
    }
  },

  android: {
    package: (PROFILE === 'production' || APP_VARIANT === 'production') ? baseId : getPackageName(),
    // Use EAS auto-increment for versionCode (no manual override needed)
    versionCode: parseInt(
      (process.env.EAS_BUILD_ANDROID_VERSION_CODE ?? '1'),
      10
    ),
    compileSdkVersion: 35,
    targetSdkVersion: 35,
    adaptiveIcon: {
      foregroundImage: "./assets/images/foreground.png",
      backgroundColor: "#f58c17"
    },
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_MEDIA_LOCATION"
    ]
  },

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png"
  },

  plugins: [
    "expo-font",
    ["expo-router", { origin: "https://xlpostcards.app" }],
    ["expo-splash-screen", {
      image: "./assets/images/icon1024.png",
      imageWidth: 200,
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    }],
    ["expo-location", {
      locationAlwaysAndWhenInUsePermission:
        "Allow $(PRODUCT_NAME) to use your location to attach it to your photos."
    }],
    ["expo-media-library", {
      photosPermission:
        "XLPostcards uses your photo library so you can select a photo for the front image on your postcard.",
      savePhotosPermission:
        "Allow XLPostcards to save photos you create.",
      isAccessMediaLocationEnabled: true
    }],
    ["expo-build-properties", {
      android: {
        compileSdkVersion: 35,
        targetSdkVersion: 35,
        buildToolsVersion: "35.0.0",
        kotlinVersion: "2.0.21",
        // Use NDK 27+ for 16 KB page size support (required by Google Play Nov 2025)
        ndkVersion: "27.0.12077973"
      }
    }],
    "./plugins/android-stripe-fix"
  ],

  experiments: {
    tsconfigPaths: true,
    newArchEnabled: true
  },

  extra: {
    // (Read these from your env; don’t hardcode secrets)
    openaiApiKey: process.env.OPENAI_API_KEY,
    stannpApiKey: process.env.STANNP_API_KEY,
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,

    // Stripe: test for dev/sim, live for prod unless FORCE_TEST_MODE is true
    stripePublishableKey: (() => {
      const test = process.env.STRIPE_PUBLISHABLE_KEY_TEST;
      const live = process.env.STRIPE_PUBLISHABLE_KEY_LIVE;
      return (FORCE_TEST_MODE ? test : live);
    })(),
    
    // Stripe merchant IDs for Apple Pay and Google Pay
    appleMerchantId: process.env.APPLE_MERCHANT_ID || 'merchant.com.patjfree.xlpostcards',
    googleMerchantId: process.env.GOOGLE_MERCHANT_ID || 'com.patjfree.xlpostcards',
    
    railwayPostcardUrl: IS_DEV 
      ? 'https://postcardservice-test.up.railway.app'
      : 'https://postcardservice-prod.up.railway.app',
    useRailway: process.env.USE_RAILWAY === 'true' || APP_VARIANT === 'development',
    postcardPriceCents: 299,
    postcardPriceDollars: 2.99,

    // Internal build number for development/simulator tracking (not visible in production)
    internalBuildNumber: "2.3.8",

    APP_VARIANT,
    eas: { projectId: "f4dc464b-4ae2-4850-820b-015a17901641" }
  }
};