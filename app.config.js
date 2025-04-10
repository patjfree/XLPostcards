require("dotenv").config();

const getAppName = () => {
  // Get the build profile from environment variable or default to 'development'
  const buildProfile = process.env.EAS_BUILD_PROFILE || 'development';
  
  switch (buildProfile) {
    case 'preview':
      return 'P:NanaGram';
    case 'production':
      return 'NanaGram';
    default:
      return 'D:NanaGram';
  }
};

const getPackageName = () => {
  const buildProfile = process.env.EAS_BUILD_PROFILE || 'development';
  const basePackage = 'com.patjfree.nanagram';
  
  switch (buildProfile) {
    case 'preview':
      return `${basePackage}.preview`;
    case 'production':
      return basePackage;
    default:
      return `${basePackage}.dev`;
  }
};

const getBundleIdentifier = () => {
  const buildProfile = process.env.EAS_BUILD_PROFILE || 'development';
  const baseIdentifier = 'com.patjfree.nanagram';
  
  switch (buildProfile) {
    case 'preview':
      return `${baseIdentifier}.preview`;
    case 'production':
      return baseIdentifier;
    default:
      return `${baseIdentifier}.dev`;
  }
};

module.exports = {
  name: getAppName(),
  slug: "NanaGram",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "myapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: getBundleIdentifier(),
    supportsTablet: true,
    deploymentTarget: "13.0",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "This app needs access to your location to attach it to photos you take.",
      ITSAppUsesNonExemptEncryption: false
    },
  },
  android: {
    package: getPackageName(),
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_MEDIA_LOCATION",
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    [
      "expo-router",
      {
        "origin": "https://nanagram.app"
      }
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow $(PRODUCT_NAME) to use your location to attach it to your photos.",
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission: "Allow $(PRODUCT_NAME) to access your photos.",
        savePhotosPermission: "Allow $(PRODUCT_NAME) to save photos.",
        isAccessMediaLocationEnabled: true,
      },
    ],
    "react-native-iap"
  ],
  experiments: {
    tsconfigPaths: true,
    newArchEnabled: true
  },
  extra: {
    // Add your environment variables here
    openaiApiKey: process.env.OPENAI_API_KEY,
    stannpApiKey: process.env.STANNP_API_KEY,
    eas: {
      projectId: "d93ea347-63a8-409b-a797-1fc8d35ac10b"
    },
  },
};
