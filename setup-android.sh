#!/bin/bash

# Set JAVA_HOME
export JAVA_HOME=/nix/store/*/jdk-17
export PATH=$JAVA_HOME/bin:$PATH

# Set ANDROID_HOME
export ANDROID_HOME=/nix/store/*/android-sdk
export PATH=$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH

# Accept Android SDK licenses
yes | sdkmanager --licenses

# Install required Android SDK components
sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"

# Set environment variables for the current session
echo "export JAVA_HOME=$JAVA_HOME" >> ~/.bashrc
echo "export ANDROID_HOME=$ANDROID_HOME" >> ~/.bashrc
echo "export PATH=$PATH" >> ~/.bashrc

# Make the script executable
chmod +x setup-android.sh

echo "Android build environment setup complete!" 