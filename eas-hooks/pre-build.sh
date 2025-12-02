#!/usr/bin/env bash
set -e

# Expo SDK 54 with React Native 0.81.5 handles NDK version automatically
# No need to manually install NDK - expo-build-properties will use the correct version
echo "✅ Expo SDK 54 manages NDK version automatically for 16 KB page size support"
