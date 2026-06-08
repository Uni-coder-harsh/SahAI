#!/bin/bash
set -e

SDK_PATH="/home/harsh/Android/Sdk"
mkdir -p "$SDK_PATH/cmdline-tools"

echo "1. Downloading Android Command Line Tools..."
wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdline-tools.zip

echo "2. Unpacking tools..."
unzip -q /tmp/cmdline-tools.zip -d "$SDK_PATH/cmdline-tools"
rm -f /tmp/cmdline-tools.zip

# Rename folder to matching 'latest' structure
rm -rf "$SDK_PATH/cmdline-tools/latest"
mv "$SDK_PATH/cmdline-tools/cmdline-tools" "$SDK_PATH/cmdline-tools/latest"

echo "3. Configuring Flutter Android SDK path..."
flutter config --android-sdk "$SDK_PATH"

echo "4. Accepting licenses..."
# Pass yes to accept all licenses
yes | "$SDK_PATH/cmdline-tools/latest/bin/sdkmanager" --licenses --sdk_root="$SDK_PATH"

echo "5. Installing platform levels (Android 34 & Build tools)..."
"$SDK_PATH/cmdline-tools/latest/bin/sdkmanager" "platform-tools" "platforms;android-34" "build-tools;34.0.0" --sdk_root="$SDK_PATH"

echo "=== Android SDK Setup Complete ==="
