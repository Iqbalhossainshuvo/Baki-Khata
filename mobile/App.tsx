import {
  HindSiliguri_400Regular, HindSiliguri_500Medium, HindSiliguri_600SemiBold, HindSiliguri_700Bold, useFonts,
} from '@expo-google-fonts/hind-siliguri';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SignOutCtx } from './src/auth';
import { configureGoogle, restoreSession, signOut, type Profile } from './src/google';
import { Home } from './src/screens/Home';
import { Login } from './src/screens/Login';
import { StoreProvider } from './src/store';
import { useTheme } from './src/theme';
import { ToastProvider } from './src/ui';

configureGoogle();

export default function App() {
  const t = useTheme();
  const [fonts] = useFonts({ HindSiliguri_400Regular, HindSiliguri_500Medium, HindSiliguri_600SemiBold, HindSiliguri_700Bold });
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    restoreSession().then(setProfile, () => setProfile(null));
  }, []);

  const logout = useCallback(() => {
    signOut().finally(() => setProfile(null));
  }, []);

  const ready = fonts && profile !== undefined;
  return (
    <SafeAreaProvider>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <ToastProvider>
        {!ready ? (
          <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={t.sub} />
          </View>
        ) : profile ? (
          <SignOutCtx.Provider value={logout}>
            <StoreProvider key={profile.email} profile={profile}>
              <Home />
            </StoreProvider>
          </SignOutCtx.Provider>
        ) : (
          <Login onSignedIn={setProfile} />
        )}
      </ToastProvider>
    </SafeAreaProvider>
  );
}
