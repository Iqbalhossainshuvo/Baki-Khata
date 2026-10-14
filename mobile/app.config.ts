import type { ExpoConfig } from 'expo/config';

// Google Sign-In on iOS needs the reversed iOS client ID as a URL scheme.
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const iosUrlScheme = iosClientId
  ? 'com.googleusercontent.apps.' + iosClientId.replace('.apps.googleusercontent.com', '')
  : 'com.googleusercontent.apps.set-EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID';

const config: ExpoConfig = {
  name: 'বাকি খাতা',
  slug: 'baki-khata',
  scheme: 'bakikhata',
  version: process.env.APP_VERSION || '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.bakikhata.app',
    supportsTablet: true,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: 'com.bakikhata.app',
    versionCode: Number(process.env.ANDROID_VERSION_CODE) || 1,
    adaptiveIcon: {
      backgroundColor: '#0a84ff',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    ['@react-native-google-signin/google-signin', { iosUrlScheme }],
    'expo-font',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 180, resizeMode: 'contain', backgroundColor: '#0a84ff' }],
  ],
};

export default config;
