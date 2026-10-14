import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signIn, type Profile } from '../google';
import { useTheme } from '../theme';
import { T, useToast } from '../ui';

const POINTS = [
  ['📒', 'কে কত বাকি — এক নজরে'],
  ['🔒', 'ডাটা থাকবে আপনার নিজের Google Drive-এ'],
  ['📱', 'যেকোনো ফোনে লগইন করলেই সব হিসাব'],
];

export function Login({ onSignedIn }: { onSignedIn: (p: Profile) => void }) {
  const t = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true);
    try {
      const p = await signIn();
      if (p) onSignedIn(p);
    } catch (e) {
      toast('⚠️ ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Image source={require('../../assets/icon.png')} style={{ width: 96, height: 96, borderRadius: 22, alignSelf: 'center', marginBottom: 20 }} />
        <T w="bold" style={{ fontSize: 38, textAlign: 'center', lineHeight: 50 }}>বাকি খাতা</T>
        <T style={{ fontSize: 17, color: t.sub, textAlign: 'center', marginTop: 4 }}>দোকানের বাকির হিসাব, সহজে</T>

        <View style={{ backgroundColor: t.card, borderRadius: 18, padding: 18, marginTop: 36, gap: 14 }}>
          {POINTS.map(([icon, text]) => (
            <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <T style={{ fontSize: 22 }}>{icon}</T>
              <T style={{ flex: 1, fontSize: 16 }}>{text}</T>
            </View>
          ))}
        </View>
      </View>

      <Pressable
        onPress={go}
        disabled={busy}
        style={({ pressed }) => ({
          height: 54, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
          backgroundColor: t.dark ? '#fff' : '#1c1c1e', opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        {busy ? <ActivityIndicator color={t.dark ? '#000' : '#fff'} /> : (
          <>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <T w="bold" style={{ color: '#4285F4', fontSize: 17, lineHeight: 22 }}>G</T>
            </View>
            <T w="semibold" style={{ color: t.dark ? '#000' : '#fff' }}>Google দিয়ে চালিয়ে যান</T>
          </>
        )}
      </Pressable>
      <T style={{ fontSize: 12, color: t.sub, textAlign: 'center', marginTop: 12 }}>
        প্রথমবার লগইন করলে আপনার Drive-এ “বাকি খাতা” নামে একটি Google Sheet তৈরি হবে।
      </T>
    </View>
  );
}
