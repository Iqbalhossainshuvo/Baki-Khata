import { Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CURRENCIES } from '../ledger';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Avatar, Group, Section, Sep, T } from '../ui';
import { useSignOut } from '../auth';

export function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const { profile, book, cur, setCur } = useStore();
  const signOut = useSignOut();

  const logout = () =>
    Alert.alert('লগ আউট করবেন?', 'আপনার ডাটা Google Drive-এ নিরাপদে থাকবে। আবার লগইন করলেই ফিরে পাবেন।', [
      { text: 'বাতিল', style: 'cancel' },
      { text: 'লগ আউট', style: 'destructive', onPress: () => { onClose(); signOut(); } },
    ]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']} style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 12 }}>
          <Pressable onPress={onClose} hitSlop={12}><T w="semibold" style={{ color: t.blue }}>সম্পন্ন</T></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, maxWidth: 600, width: '100%', alignSelf: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: 26 }}>
            {profile.photo ? <Image source={{ uri: profile.photo }} style={{ width: 72, height: 72, borderRadius: 36 }} /> : <Avatar name={profile.name} size={72} />}
            <T w="bold" style={{ fontSize: 22, marginTop: 10, lineHeight: 32 }}>{profile.name}</T>
            <T style={{ fontSize: 15, color: t.sub }}>{profile.email}</T>
          </View>

          <Section>মুদ্রা</Section>
          <Group style={{ padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CURRENCIES.map(c => (
              <Pressable key={c} onPress={() => setCur(c)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: c === cur ? t.blue : t.fill }}>
                <T w="semibold" style={{ fontSize: 15, color: c === cur ? '#fff' : t.text }}>{c}</T>
              </Pressable>
            ))}
          </Group>

          <Section>ডাটা</Section>
          <Group>
            <Row label="Google Sheet খুলুন ↗" color={t.blue} disabled={!book} onPress={() => book && Linking.openURL(book.url)} />
            <Sep />
            <Row label="লগ আউট" color={t.red} onPress={logout} />
          </Group>
          <T style={{ fontSize: 13, color: t.sub, textAlign: 'center', lineHeight: 20 }}>
            সব হিসাব আপনার নিজের Google Drive-এর “বাকি খাতা” শিটে সেভ হয়।{'\n'}অ্যাপটি শুধু নিজের তৈরি করা ফাইলই দেখতে পারে।
          </T>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Row({ label, color, onPress, disabled }: { label: string; color: string; onPress: () => void; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 13, backgroundColor: pressed ? t.fill : 'transparent', opacity: disabled ? 0.4 : 1 })}>
      <T style={{ color }}>{label}</T>
    </Pressable>
  );
}
