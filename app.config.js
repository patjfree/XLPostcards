import 'dotenv/config';
//require("dotenv").config(); - comment out for now

// ✅ Use APP_VARIANT directly (not EAS_BUILD_PROFILE)
const APP_VARIANT = process.env.EAS_BUILD_PROFILE || process.env.APP_VARIANT || 'development';

const IS_DEV = APP_VARIANT === 'development';
const IS_PREVIEW = APP_VARIANT === 'preview';

const getAppName = () => {
  if (IS_DEV) return 'D:XLPostcards';
  if (IS_PREVIEW) return 'P:XLPostcards';
  return 'XLPostcards';
};

console.log('APP_VARIANT:', APP_VARIANT, 'App Name:', getAppName());

const getPackageName = () => {
  const basePackage = 'com.patjfree.xlpostcards';
  if (IS_DEV) return `${basePackage}.dev`;
  if (IS_PREVIEW) return `${basePackage}.preview`;
  return basePackage;
};

const getBundleIdentifier = () => {
  const baseIdentifier = 'com.patjfree.xlpostcards';
  if (IS_DEV) return `${baseIdentifier}.dev`;
  if (IS_PREVIEW) return `${baseIdentifier}.preview`;
  return baseIdentifier;
};

module.exports = {
  // ✅ You can switch this back to dynamic later
  name: "Postcard", // This will be the display name on the home screen
  slug: "XLPostcards",
  version: "1.1.0",
  runtimeVersion: {
    policy: "appVersion"
  },
  orientation: "portrait",
  icon: "./assets/images/icon1024.png",
  scheme: "XLPostcards",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/icon1024.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: getBundleIdentifier(),
    supportsTablet: true,
    deploymentTarget: "13.0",
    buildNumber: process.env.IOS_BUILD_NUMBER || "2",
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        "XLPostcards uses your photo library so you can select a photo for the front image on your postcard.",
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    package: getPackageName(),
    versionCode: process.env.ANDROID_VERSION_CODE
      ? parseInt(process.env.ANDROID_VERSION_CODE, 10)
      : 6,
    compileSdkVersion: 35,
    targetSdkVersion: 35,
    adaptiveIcon: {
      foregroundImage: "./assets/images/foreground.png",
      backgroundColor: "#f58c17"
    },
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_MEDIA_LOCATION",
      "com.android.vending.BILLING"
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-font",
    ["expo-router", { origin: "https://xlpostcards.app" }],
    ["expo-splash-screen", {
      image: "./assets/images/icon1024.png",
      imageWidth: 200,
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    }],
    ["expo-location", {
      locationAlwaysAndWhenInUsePermission:
        "Allow $(PRODUCT_NAME) to use your location to attach it to your photos.",
    }],
    ["expo-media-library", {
      photosPermission: "XLPostcards uses your photo library so you can select a photo for the front image on your postcard.",
      savePhotosPermission: "Allow XLPostcards to save photos you create.",
      isAccessMediaLocationEnabled: true,
    }],
    ["expo-build-properties", {
      android: {
        compileSdkVersion: 35,
        targetSdkVersion: 35,
        buildToolsVersion: "35.0.0"
      },
    }],
    "react-native-iap"
  ],
  experiments: {
    tsconfigPaths: true,
    newArchEnabled: true
  },
  extra: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    stannpApiKey: process.env.STANNP_API_KEY,
    stripePublishableKey: APP_VARIANT === 'development' 
      ? process.env.STRIPE_PUBLISHABLE_KEY_TEST 
      : process.env.STRIPE_PUBLISHABLE_KEY_LIVE,
    n8nWebhookUrl_dev: 'https://trulygarden.app.n8n.cloud/webhook/stripe-payment-intent-dev',
    n8nWebhookUrl_prod: 'https://trulygarden.app.n8n.cloud/webhook/stripe-payment-intent-prod',
    postcardPriceCents: 199,
    postcardPriceDollars: 1.99,
    APP_VARIANT: APP_VARIANT,
    eas: { projectId: "19ca6de3-2925-45e9-afb3-08d23548a9a4" }
  }
};