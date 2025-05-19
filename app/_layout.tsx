import 'react-native-get-random-values'; // <-- trying to force the polyfill import to fix crypto error with UUID
import '../config'; // <-- Import config to ensure it's loaded
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { iapManager, clearStalePurchases } from '../utils/iapManager';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot } from 'expo-router';

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
          console.error('[XLPOSTCARDS][IAP] Error initializing IAP manager:', error);
        });
      });
      // Set navigation bar color to white to match app background
      SystemUI.setBackgroundColorAsync('#fff');
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const stripePublishableKey = Constants.expoConfig?.extra?.stripePublishableKey || '';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider publishableKey={stripePublishableKey}>
        <Slot />
        <StatusBar style="dark" />
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
