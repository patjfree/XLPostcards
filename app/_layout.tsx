import 'react-native-get-random-values'; // <-- trying to force the polyfill import to fix crypto error with UUID
import '../config'; // <-- Import config to ensure it's loaded
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
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
      // Set navigation bar color to white to match app background
      SystemUI.setBackgroundColorAsync('#e5851a');
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const stripePublishableKey = Constants.expoConfig?.extra?.stripePublishableKey || '';
  
  // Simple debug logging
  const appVariant = Constants.expoConfig?.extra?.APP_VARIANT;
  const version = Constants.expoConfig?.version;
  const isTestKey = stripePublishableKey.startsWith('pk_test');
  
  console.log('🔧 ===== BUILD INFO =====');
  console.log('📱 App Version:', version);
  console.log('🏷️  App Variant:', appVariant); 
  console.log('💳 Stripe Key Type:', isTestKey ? 'TEST (pk_test)' : 'LIVE (pk_live)');
  console.log('🔧 =====================');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider publishableKey={stripePublishableKey}>
        <Slot />
        <StatusBar style="dark" />
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
