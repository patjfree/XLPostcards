import 'react-native-get-random-values'; // <-- trying to force the polyfill import to fix crypto error with UUID
import '../config'; // <-- This will run the polyfill import
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { iapManager, clearStalePurchases } from '../utils/iapManager';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      // Clear any stale IAP transactions before initializing IAP manager
      clearStalePurchases().then(() => {
        // Initialize IAP manager when fonts are loaded
        iapManager.initialize().catch((error: any) => {
          console.error('[NANAGRAM][IAP] Error initializing IAP manager:', error);
        });
      });
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const stripePublishableKey = Constants.expoConfig?.extra?.stripePublishableKey || '';

  return (
    <StripeProvider publishableKey={stripePublishableKey}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="postcard-preview" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" />
    </StripeProvider>
  );
}
