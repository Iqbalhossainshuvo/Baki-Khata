import {
  HindSiliguri_400Regular, HindSiliguri_500Medium, HindSiliguri_600SemiBold, HindSiliguri_700Bold, useFonts,
} from '@expo-google-fonts/hind-siliguri';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthCtx } from './src/auth';
import { configureGoogle, endGuest, GUEST, restoreSession, signIn, signOut, startGuest, type Profile } from './src/google';
import type { Entry } from './src/ledger';
import { appendEntries, openBook } from './src/sheets';
import { Home } from './src/screens/Home';
import { Login } from './src/screens/Login';
import { StoreProvider } from './src/store';
import { useTheme } from './src/theme';
import { ToastProvider } from './src/ui';

configureGoogle();

export default function App() {
  const t = useTheme();
  const [fontsLoaded, fontError] = useFonts({ HindSiliguri_400Regular, HindSiliguri_500Medium, HindSiliguri_600SemiBold, HindSiliguri_700Bold });
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    restoreSession().then(setProfile, () => setProfile(null));
  }, []);

  const logout = useCallback(() => {
    if (profile?.guest) endGuest().finally(() => setProfile(null));
    else signOut().finally(() => setProfile(null));
  }, [profile]);

  const guest = useCallback(() => {
    startGuest().finally(() => setProfile(GUEST));
  }, []);

  // Guest → Google: copy this phone's entries into the user's own sheet.
  const connectGoogle = useCallback(async () => {
    const p = await signIn();
    if (!p) return;
    const key = `entries:${GUEST.email}`;
    const local: Entry[] = JSON.parse((await AsyncStorage.getItem(key)) || '[]');
    if (local.length) {
      await appendEntries(await openBook(), local);
      await AsyncStorage.removeItem(key);
    }
    await endGuest();
    setProfile(p);
  }, []);

  const auth = useMemo(() => ({ signOut: logout, connectGoogle }), [logout, connectGoogle]);

  // A font failure must not block the app — fall back to the system font.
  const ready = (fontsLoaded || !!fontError) && profile !== undefined;
  return (
    <SafeAreaProvider>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <ToastProvider>
        {!ready ? (
          <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={t.sub} />
          </View>
        ) : profile ? (
          <AuthCtx.Provider value={auth}>
            <StoreProvider key={profile.email} profile={profile}>
              <Home />
            </StoreProvider>
          </AuthCtx.Provider>
        ) : (
          <Login onSignedIn={setProfile} onGuest={guest} />
        )}
      </ToastProvider>
    </SafeAreaProvider>
  );
}
