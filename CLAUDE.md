# CLAUDE.md

## 7 Claude rules
1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the [todo.md](http://todo.md/) file with a summary of the changes you made and any other relevant information.


This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XLPostcards is a React Native mobile application built with Expo that allows users to create and send physical postcards. The app enables users to select photos, add custom messages, choose recipients, and process payments to mail physical postcards via the Stannp API.

## Architecture & Tech Stack

- **Framework**: React Native with Expo SDK 52
- **Router**: Expo Router with file-based routing
- **State Management**: Zustand stores located in `src/store/`
- **Payments**: Stripe integration with in-app purchases
- **UI**: React Native components with custom themed components
- **Backend Services**: 
  - Stannp API for postcard printing/mailing
  - OpenAI API for AI-generated content
  - n8n webhooks for payment processing
- **Image Processing**: Expo Image Picker and Image Manipulator
- **Storage**: AsyncStorage for local data persistence

## Key Directories

- `app/` - Main application screens using Expo Router
  - `(drawer)/` - Drawer navigation group with main screens
  - `components/` - Screen-specific components
- `src/store/` - Zustand state management stores
- `utils/` - Utility functions and services
- `components/` - Reusable UI components
- `assets/` - Static assets (images, fonts)
- `ios/` & `android/` - Native platform code (ejected from Expo Go)

## Development Commands

```bash
# Start development server
npm start

# Run on specific platforms
npm run android
npm run ios
npm run web

# Run tests
npm test

# Lint code
npm run lint

# Reset project to clean state
npm run reset-project
```

## Build & Deployment

### EAS Build Configuration
- Development: `npx eas build --platform ios --profile development`
- Preview: `npx eas build --platform ios --profile preview`
- Production: `npx eas build --platform ios --profile production`

### Environment Variants
The app supports three build variants controlled by `APP_VARIANT` environment variable:
- `development` - Dev builds with test keys
- `preview` - Preview builds for testing
- `production` - Production builds with live keys

## State Management Architecture

The app uses multiple Zustand stores for different domains:
- `postcardStore` - Postcard ID tracking
- `imageStore` - Selected image management
- `messageStore` - Postcard message content
- `addressStore` - Recipient address information
- `addressBookStore` - Saved contacts
- `paymentStore` - Payment processing state
- `authStore` - User authentication
- `loadingStore` - Global loading states
- `errorStore` - Error message handling
- `successStore` - Success message handling
- `stannpStore` - Stannp API integration state

## Key Services

### PostcardService (`utils/postcardService.ts`)
- Manages postcard transaction lifecycle
- Handles idempotency for payment processing
- Local storage of transaction states

### IAPManager (`utils/iapManager.ts`)
- React Native IAP integration
- Stripe payment processing
- Transaction validation and cleanup

### StripeManager (`utils/stripeManager.ts`)
- Payment processing coordination
- Webhook integration with n8n

## API Integrations

### Environment Variables
Required environment variables (configured in `babel.config.js`):
- `OPENAI_API_KEY` - OpenAI API access
- `STANNP_API_KEY` - Stannp postcard service API
- `STRIPE_PUBLISHABLE_KEY_TEST` - Stripe test key
- `STRIPE_PUBLISHABLE_KEY_LIVE` - Stripe production key

### External Services
- **Stannp API**: Physical postcard printing and mailing
- **OpenAI API**: AI-generated postcard messages
- **Stripe**: Payment processing
- **n8n Webhooks**: Payment processing automation

## Development Notes

### TypeScript Configuration
- Strict mode enabled with comprehensive type checking
- Path aliases configured with `@/*` pointing to project root
- Isolated modules compilation for better performance

### Platform-Specific Considerations
- **iOS**: Requires proper provisioning profiles and certificates
- **Android**: Uses keystore for signing (development keystore included)
- **Web**: Metro bundler with static output

### Testing Strategy
- Jest configured with `jest-expo` preset
- Component tests in `__tests__` directories
- Snapshot testing enabled

## Common Development Tasks

### Adding New Screens
1. Create screen file in `app/` directory
2. Expo Router automatically handles routing based on file structure
3. Use drawer navigation structure in `app/(drawer)/` for main screens

### State Management
1. Create new Zustand store in `src/store/` if needed
2. Import and use store hooks in components
3. Follow existing store patterns for consistency

### Image Handling
- Use Expo Image Picker for photo selection
- Process images with Expo Image Manipulator
- Store image URIs in `imageStore` Zustand store

### Payment Processing
1. Initialize payment with IAPManager
2. Process through Stripe
3. Handle webhooks via n8n
4. Track transaction state in PostcardService

## Build Troubleshooting

### iOS Build Issues
- Ensure proper bundle identifiers for each variant
- Check provisioning profiles match bundle IDs
- Verify iOS deployment target compatibility (13.0+)

### Android Build Issues
- Confirm package names are unique per variant
- Check keystore configuration
- Verify required permissions in AndroidManifest

### Metro Bundler
- Clear cache: `npx expo start --clear`
- Reset Metro: `npx react-native start --reset-cache`