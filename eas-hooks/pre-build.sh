#!/usr/bin/env bash
set -e

echo "🔧 Forcing install of NDK r28..."
yes | sdkmanager "ndk;28.0.12674087" || true
