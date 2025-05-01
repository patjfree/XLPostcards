require("dotenv").config();

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getAppName = () => {
  if (IS_DEV) {
    return 'D:NanaGram';
  }

  if (IS_PREVIEW) {
    return 'P:NanaGram';
  }

  return 'NanaGram';  // Production is default
};

const getPackageName = () => {
  const basePackage = 'com.patjfree.nanagram';
  
  if (IS_DEV) {
    return `${basePackage}.dev`;
  }
  
  if (IS_PREVIEW) {
    return `${basePackage}.preview`;
  }
  
  return basePackage;  // Production is default
};

const getBundleIdentifier = () => {
  const baseIdentifier = 'com.patjfree.nanagram';
  
  if (IS_DEV) {
    return `${baseIdentifier}.dev`;
  }
  
  if (IS_PREVIEW) {
    return `${baseIdentifier}.preview`;
  }
  
  return baseIdentifier;  // Production is default
};

module.exports = {
  name: getAppName(),
  slug: "NanaGram",
  // version: process.env.APP_VERSION || "1.0.0", //Auto-incremented by EAS for singl
  version: "1.0.7", // must be manually updated if sharing between 
  runtimeVersion: {
    policy: "appVersion"
  },
  orientation: "portrait",
  icon: "./assets/images/icon1024.png",
  scheme: "myapp",
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
    buildNumber: process.env.IOS_BUILD_NUMBER || "1",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "This app needs access to your location to attach it to photos you take.",
      NSCameraUsageDescription:
        "NanaGram uses the camera to let you take a photo to send on your postcard.",
      NSPhotoLibraryUsageDescription:
        "NanaGram uses your photo library so you can select an existing photo to add to your postcard.",
      NSContactsUsageDescription:
        "NanaGram uses your contacts to let you quickly select a recipient’s address when sending a postcard.",
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    package: getPackageName(),
    // versionCode: process.env.ANDROID_VERSION_CODE ? parseInt(process.env.ANDROID_VERSION_CODE, 10) : 1,  // for single dev
    //versionCode: 6, // must be manually updated if sharing between devs
    versionCode: process.env.ANDROID_VERSION_CODE
  ? parseInt(process.env.ANDROID_VERSION_CODE, 10)
  : 6,

    icon: "./assets/images/icon1024.png",
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
    [
      "expo-router",
      {
        "origin": "https://nanagram.app"
      }
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/icon1024.png",
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
    APP_VARIANT: process.env.APP_VARIANT || 'production',  // Set production as default
    eas: {
      projectId: "d93ea347-63a8-409b-a797-1fc8d35ac10b"  //Patrick Expo
      //projectId: "a452b579-b559-43cc-a7bf-81a002fd4dae" //Charles Expo
    },
  },
};
