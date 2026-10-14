import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CURRENCIES, DEFAULT_TEMPLATE } from '../ledger';
import { useStore } from '../store';
import { font, useTheme } from '../theme';
import { Avatar, Group, Section, Sep, T } from '../ui';
import { useAuth } from '../auth';
import { errorText } from '../google';

export function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const { profile, book, cur, setCur, template, setTemplate } = useStore();
  const [tpl, setTpl] = useState(template);
  useEffect(() => setTpl(template), [template]);
  const { signOut, connectGoogle } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const guest = !!profile.guest;

  const logout = () =>
    Alert.alert(
      guest ? 'লগইন স্ক্রিনে ফিরে যাবেন?' : 'লগ আউট করবেন?',
      guest
        ? 'এই ফোনের হিসাব মুছবে না। আবার “লগইন ছাড়া ব্যবহার করুন” চাপলেই ফিরে পাবেন।'
        : 'আপনার ডাটা Google Drive-এ নিরাপদে থাকবে। আবার লগইন করলেই ফিরে পাবেন।',
      [
        { text: 'বাতিল', style: 'cancel' },
        { text: guest ? 'ফিরে যান' : 'লগ আউট', style: 'destructive', onPress: () => { onClose(); signOut(); } },
      ],
    );

  const connect = async () => {
    setConnecting(true);
    try {
      await connectGoogle();
    } catch (e) {
      Alert.alert('Google-এ নেওয়া যায়নি', errorText(e) + '\n\nআপনার হিসাব এই ফোনেই আছে।');
    } finally {
      setConnecting(false);
    }
  };

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
            {!guest && <T style={{ fontSize: 15, color: t.sub }}>{profile.email}</T>}
          </View>

          {guest && (
            <Group style={{ padding: 16 }}>
              <T w="semibold" style={{ fontSize: 16 }}>📱 হিসাব শুধু এই ফোনে আছে</T>
              <T style={{ fontSize: 14, color: t.sub, marginTop: 4, lineHeight: 21 }}>
                ফোন হারালে বা অ্যাপ মুছলে হিসাব হারিয়ে যাবে। Google দিয়ে লগইন করলে সব হিসাব আপনার Google Drive-এ চলে যাবে এবং যেকোনো ফোনে পাবেন।
              </T>
              <Pressable
                onPress={connect}
                disabled={connecting}
                style={({ pressed }) => ({ marginTop: 12, height: 46, borderRadius: 12, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}
              >
                {connecting ? <ActivityIndicator color="#fff" /> : <T w="semibold" style={{ color: '#fff', fontSize: 16 }}>Google দিয়ে লগইন করে ব্যাকআপ নিন</T>}
              </Pressable>
            </Group>
          )}

          <Section>মুদ্রা</Section>
          <Group style={{ padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CURRENCIES.map(c => (
              <Pressable key={c} onPress={() => setCur(c)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: c === cur ? t.blue : t.fill }}>
                <T w="semibold" style={{ fontSize: 15, color: c === cur ? '#fff' : t.text }}>{c}</T>
              </Pressable>
            ))}
          </Group>

          <Section>রিমাইন্ডার মেসেজ</Section>
          <Group>
            <TextInput
              value={tpl}
              onChangeText={setTpl}
              onBlur={() => setTemplate(tpl)}
              multiline
              textAlignVertical="top"
              style={{ minHeight: 100, fontFamily: font.regular, fontSize: 16, color: t.text, paddingHorizontal: 16, paddingVertical: 12, lineHeight: 24 }}
            />
            <Sep />
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 }}>
              <T style={{ flex: 1, fontSize: 13, color: t.sub }}>{'{নাম}'} আর {'{টাকা}'} প্রত্যেক কাস্টমারের জন্য নিজে থেকে বসে যাবে।</T>
              {tpl !== template && (
                <Pressable onPress={() => setTemplate(tpl)} hitSlop={8}><T w="semibold" style={{ color: t.blue, fontSize: 15 }}>সেভ</T></Pressable>
              )}
              {tpl === template && template !== DEFAULT_TEMPLATE && (
                <Pressable onPress={() => { setTpl(DEFAULT_TEMPLATE); setTemplate(DEFAULT_TEMPLATE); }} hitSlop={8}>
                  <T style={{ color: t.blue, fontSize: 15 }}>আগের মতো</T>
                </Pressable>
              )}
            </View>
          </Group>

          <Section>ডাটা</Section>
          <Group>
            {!guest && (
              <>
                <Row label="Google Sheet খুলুন ↗" color={t.blue} disabled={!book} onPress={() => book && Linking.openURL(book.url)} />
                <Sep />
              </>
            )}
            <Row label={guest ? 'লগইন স্ক্রিনে ফিরে যান' : 'লগ আউট'} color={t.red} onPress={logout} />
          </Group>
          {!guest && (
            <T style={{ fontSize: 13, color: t.sub, textAlign: 'center', lineHeight: 20 }}>
              সব হিসাব আপনার নিজের Google Drive-এর “বাকি খাতা” শিটে সেভ হয়।{'\n'}অ্যাপটি শুধু নিজের তৈরি করা ফাইলই দেখতে পারে।
            </T>
          )}
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
