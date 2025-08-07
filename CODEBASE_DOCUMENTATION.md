# XLPostcards Codebase Documentation

## Overview
This document describes the current active files in the XLPostcards React Native app and their purposes after cleanup.

## Core Architecture

### Main App Files

#### `app/(drawer)/index.tsx`
**Purpose**: Main home screen of the application
- Photo selection (camera/gallery with rotation)
- Message input functionality  
- Recipient address management
- Postcard size selection (4x6 vs 6x9)
- Navigation to preview screen
- **Key Features**: Image picker integration, address book integration, validation

#### `app/postcard-preview.tsx`
**Purpose**: Preview and purchase screen for postcards
- Displays front and back postcard preview
- Handles purchase flow (Google Pay/Stripe)
- Sends data to Stannp API for printing
- **Key Features**: ViewShot for image capture, IAP integration, Stannp API calls
- **Critical Component**: This is where the actual postcard generation happens

#### `app/(drawer)/settings.tsx`
**Purpose**: App settings screen (minimal functionality)
- Currently basic settings display
- Future expansion point for user preferences

#### `app/(drawer)/_layout.tsx`
**Purpose**: Drawer navigation layout
- Navigation structure for the app
- Sidebar menu configuration

#### `app/_layout.tsx`
**Purpose**: Root layout wrapper
- Global providers and app-wide configuration
- Navigation structure setup

#### `app/+not-found.tsx`
**Purpose**: 404 error screen
- Handles unknown routes

### Components

#### `app/components/PostcardBackLayout.tsx`
**Purpose**: CRITICAL - Renders the back of postcards for both preview AND Stannp output
- **This is the component that generates actual printed postcards**
- Dynamic font sizing based on resolution (preview vs print)
- Message area layout with proper boundaries
- Address formatting and positioning
- **Key Features**: Resolution detection, Stannp-exact positioning, dynamic fonts

#### `app/components/AIDisclaimer.tsx`
**Purpose**: Displays AI usage disclaimer
- Shows terms about photo enhancement
- Used on main screen and preview screen

### Utilities

#### `utils/iapManager.ts`
**Purpose**: Handles in-app purchases (Google Pay/iOS)
- Purchase processing and validation
- Error handling for payment flows
- **Key Features**: Platform-specific payment handling, transaction management

#### `utils/postcardService.ts`
**Purpose**: Backend service communication
- Transaction tracking
- Status management for purchases
- **Key Features**: Prevents duplicate purchases, tracks completion status

#### `utils/stripeManager.ts`
**Purpose**: Stripe payment integration for iOS
- iOS-specific payment processing
- Stripe API integration

### Configuration

#### `app.config.js`
**Purpose**: Expo app configuration
- App metadata, icons, splash screens
- Environment-specific settings
- Build configurations

#### `eas.json`
**Purpose**: EAS build configuration
- Build profiles (development, production)
- Platform-specific build settings
- **Key Features**: Version management, credential handling

#### `package.json`
**Purpose**: Node.js dependencies and scripts
- All npm package dependencies
- Build and development scripts

#### `babel.config.js`
**Purpose**: JavaScript transpilation configuration
- Babel presets and plugins for React Native

#### `metro.config.js`
**Purpose**: Metro bundler configuration
- Asset resolution and bundling settings

#### `config.js`
**Purpose**: Runtime configuration loading
- Environment variable loading
- Configuration validation

### Assets

#### `assets/images/icon1024.png`
**Purpose**: Main app icon
- Used for iOS/Android app icons
- 1024x1024 resolution

#### `assets/images/foreground.png`
**Purpose**: Android adaptive icon foreground
- Android-specific icon layer

#### `assets/images/favicon.png`
**Purpose**: Web favicon
- Used for web builds

#### `assets/images/XLPostcards-Header.png`
**Purpose**: App header logo
- Displayed on main screen
- Brand identity

#### `assets/images/TruePostage.jpeg`
**Purpose**: Postal indicia for postcards
- **CRITICAL**: Used on printed postcards for postage
- Required for USPS compliance

#### `assets/images/stamp.png`
**Purpose**: Stamp graphic for postcard design
- Visual element for postcard back

#### `assets/fonts/SpaceMono-Regular.ttf`
**Purpose**: Custom font
- Typography for app interface

### Type Definitions

#### `types/env.d.ts`
**Purpose**: Environment variable type definitions
- TypeScript types for configuration

#### `types/global.d.ts`
**Purpose**: Global type declarations
- Image file type declarations
- Global interface definitions

#### `types/react-native-canvas.d.ts`
**Purpose**: Canvas library type definitions
- TypeScript support for canvas operations

## Key Architectural Decisions

### Component Separation
- **PostcardBackLayout**: Used for BOTH preview and Stannp output (resolution-aware)
- **Dynamic sizing**: Automatically detects if rendering for preview (small) or print (full resolution)

### Payment Flow
- **Android**: Google Play In-App Purchases via `iapManager.ts`
- **iOS**: Stripe Payment Sheet via `stripeManager.ts`

### Image Processing
- **Front images**: Processed with bleed area for print quality
- **Back images**: Generated using ViewShot with exact Stannp dimensions

### Critical Success Verification
- **Stannp confirmation required**: Success modal only appears after Stannp API confirms postcard creation
- **Transaction tracking**: Prevents duplicate submissions via `postcardService.ts`

## Development Workflow

1. **Main Screen** (`index.tsx`): User selects photo, enters message, chooses recipient
2. **Preview Screen** (`postcard-preview.tsx`): User reviews and initiates purchase
3. **Payment Processing** (`iapManager.ts`): Handles platform-specific payments
4. **Stannp Submission** (`PostcardBackLayout.tsx`): Generates final postcard for printing
5. **Success Confirmation**: Only shows when Stannp confirms successful submission

## Important Notes

- **PostcardBackLayout is CRITICAL**: This single component generates both preview and print output
- **Resolution detection**: Component automatically uses correct font sizes based on usage context
- **Stannp-first design**: Layout designed for print specifications first, then scaled for preview
- **No duplicate prevention**: Built-in transaction tracking prevents double-charges