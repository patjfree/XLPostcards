module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': '.',
          },
        },
      ],
      [
        'module:react-native-dotenv',
        {
          envName: 'APP_ENV',
          moduleName: '@env',
          path: '.env',
          safe: false,
          allowUndefined: false,
          verbose: false,
          whitelist: [
            'OPENAI_API_KEY',
            'STANNP_API_KEY',
            'STRIPE_PUBLISHABLE_KEY_TEST',
            'STRIPE_PUBLISHABLE_KEY_LIVE'
          ]
        },
      ],
      // react-native-reanimated plugin MUST be last
      'react-native-reanimated/plugin',
    ],
  };
}; 