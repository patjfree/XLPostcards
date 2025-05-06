import {
  OPENAI_API_KEY as ENV_OPENAI_API_KEY,
  STANNP_API_KEY as ENV_STANNP_API_KEY,
  STRIPE_PUBLISHABLE_KEY as ENV_STRIPE_PUBLISHABLE_KEY
} from '@env';
import Constants from 'expo-constants';
import 'react-native-get-random-values';

const config = {
  APP_VARIANT: Constants.expoConfig?.extra?.APP_VARIANT || 'production',
  NODE_ENV: Constants.expoConfig?.extra?.NODE_ENV || 'production',
  OPENAI_API_KEY: ENV_OPENAI_API_KEY || Constants.expoConfig?.extra?.openAiApiKey || '',
  STANNP_API_KEY: ENV_STANNP_API_KEY || Constants.expoConfig?.extra?.stannpApiKey || '',
  STRIPE_PUBLISHABLE_KEY: ENV_STRIPE_PUBLISHABLE_KEY || Constants.expoConfig?.extra?.stripePublishableKey || '',
};

// Make sure these are available globally
Object.keys(config).forEach(key => {
  global[key] = config[key];
});

export default config; 