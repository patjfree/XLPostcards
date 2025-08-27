import 'dotenv/config';

const PROFILE = process.env.EAS_BUILD_PROFILE || '';
// Prefer explicit APP_VARIANT; otherwise map common profiles to a variant:
// Force development for any simulator build
const APP_VARIANT =
  (PROFILE === 'ios-simulator' || PROFILE.includes('simulator')) ? 'development' :
  process.env.APP_VARIANT ||
  (PROFILE === 'development' ? 'development'
   : PROFILE === 'preview' ? 'preview'
   : 'production');

const IS_DEV = APP_VARIANT === 'development';
const IS_IOS_SIMULATOR = PROFILE === 'ios-simulator';
// Force test mode for any simulator build, regardless of APP_VARIANT
const FORCE_TEST_MODE = IS_DEV || IS_IOS_SIMULATOR || PROFILE.includes('simulator');
const IS_PREVIEW = APP_VARIANT === 'preview';

const getAppName = () => {
  if (IS_DEV) return 'D:XLPostcards';
  if (IS_PREVIEW) return 'P:XLPostcards';
  return 'XLPostcards';
};

console.log('EAS_BUILD_PROFILE:', PROFILE);
console.log('APP_VARIANT:', APP_VARIANT, 'App Name:', getAppName());
console.log('IS_DEV:', IS_DEV);
console.log('Test key available:', !!process.env.STRIPE_PUBLISHABLE_KEY_TEST);
console.log('Live key available:', !!process.env.STRIPE_PUBLISHABLE_KEY_LIVE);

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
  version: "2.0.23",
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
    buildNumber: process.env.IOS_BUILD_NUMBER || "4",
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
    stripePublishableKey: (() => {
      // HARDCODE test key for simulator builds to bypass environment issues
      if (PROFILE === 'ios-simulator' || PROFILE.includes('simulator')) {
        console.log('🔧 SIMULATOR BUILD: Using hardcoded test key');
        return process.env.STRIPE_PUBLISHABLE_KEY_TEST || 'pk_test_51QRNBvKwD63LKpuWJ3IWHYKLYWVML6Fia6Yci4mcLRbSwHz7AsfOBtnlighyfJFBi1CxDzFnQ56XaksSUIcUyV6H00rQww6LU0';
      }
      
      const selectedKey = FORCE_TEST_MODE 
        ? process.env.STRIPE_PUBLISHABLE_KEY_TEST 
        : process.env.STRIPE_PUBLISHABLE_KEY_LIVE;
      console.log('FORCE_TEST_MODE:', FORCE_TEST_MODE);
      console.log('Selected Stripe Key (first 15 chars):', selectedKey?.substring(0, 15) + '...');
      console.log('Is Test Key (pk_test):', selectedKey?.startsWith('pk_test'));
      return selectedKey;
    })(),
    n8nWebhookUrl_dev: 'https://trulygarden.app.n8n.cloud/webhook/stripe-payment-intent-dev',
    n8nWebhookUrl_prod: 'https://trulygarden.app.n8n.cloud/webhook/stripe-payment-intent-prod',
    n8nPostcardBackWebhookUrl: 'https://trulygarden.app.n8n.cloud/webhook/generate-postcard-back-unified',
    postcardPriceCents: 199,
    postcardPriceDollars: 1.99,
    APP_VARIANT: APP_VARIANT,
    eas: { projectId: "19ca6de3-2925-45e9-afb3-08d23548a9a4" }
  }
};
