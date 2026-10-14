import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EPS, customers, day, key, money, status, type EntryType } from '../ledger';
import { useStore } from '../store';
import { font, useTheme } from '../theme';
import { Avatar, Btn, Field, Group, Section, Segmented, Sep, T, useToast } from '../ui';
import { CustomerModal } from './CustomerModal';
import { SettingsModal } from './SettingsModal';

const TYPES: { value: EntryType; label: string }[] = [
  { value: 'বাকি', label: '+ বাকি দিলাম' },
  { value: 'জমা', label: '− টাকা পেলাম' },
];

export function Home() {
  const t = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { entries, loaded, syncing, error, cur, profile, refresh, add } = useStore();

  const [type, setType] = useState<EntryType>('বাকি');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);

  const cs = useMemo(() => customers(entries), [entries]);
  const due = cs.filter(c => c.bal > EPS);
  const adv = cs.filter(c => c.bal < -EPS);
  const total = due.reduce((s, c) => s + c.bal, 0);
  const list = cs.filter(c => !q || key(c.name).includes(key(q)));
  const nameKey = key(name);
  const suggestions = nameKey ? cs.filter(c => c.k.includes(nameKey) && c.k !== nameKey).slice(0, 6) : [];

  const save = async () => {
    const amt = parseFloat(amount);
    if (!name.trim()) return toast('কাস্টমারের নাম লিখুন');
    if (!(amt > 0)) return toast('পরিমাণ লিখুন');
    const existing = cs.find(c => c.k === nameKey);
    const keep = { name, amount, note };
    setBusy(true);
    const p = add({ customer: existing ? existing.name : name.trim(), type, amount: amt, note: note.trim() });
    setName(''); setAmount(''); setNote(''); Keyboard.dismiss();
    toast(type === 'জমা' ? 'জমা হয়েছে ✓' : 'বাকি যোগ হয়েছে ✓');
    try {
      await p;
    } catch (e) {
      setName(keep.name); setAmount(keep.amount); setNote(keep.note);
      toast('⚠️ সেভ হয়নি: ' + (e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const onRefresh = () => refresh().catch(e => toast('⚠️ ' + (e instanceof Error ? e.message : e)));

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, paddingHorizontal: 16, maxWidth: 600, width: '100%', alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={syncing && loaded} onRefresh={onRefresh} tintColor={t.sub} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginHorizontal: 4 }}>
          <T w="bold" style={{ fontSize: 34, flex: 1, lineHeight: 46 }}>বাকি খাতা</T>
          <Pressable onPress={() => setSettings(true)} hitSlop={10}>
            {profile.photo ? <Image source={{ uri: profile.photo }} style={{ width: 36, height: 36, borderRadius: 18 }} /> : <Avatar name={profile.name} size={36} />}
          </Pressable>
        </View>

        {!!error && (
          <Pressable onPress={onRefresh} style={{ backgroundColor: t.red + '22', borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <T style={{ fontSize: 14, color: t.red }}>⚠️ সিঙ্ক হয়নি: {error}{'\n'}আবার চেষ্টা করতে চাপুন</T>
          </Pressable>
        )}

        <View style={{ backgroundColor: t.card, borderRadius: 22, padding: 22, marginBottom: 28 }}>
          <T w="medium" style={{ fontSize: 13, color: t.sub }}>সবার কাছে মোট পাওনা</T>
          <T w="bold" style={{ fontSize: 40, lineHeight: 56, letterSpacing: -1 }} adjustsFontSizeToFit numberOfLines={1}>{loaded ? money(cur, total) : '—'}</T>
          <View style={{ flexDirection: 'row', gap: 24, marginTop: 10, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: t.sep }}>
            <Stat label="বাকি আছে" value={`${due.length} জন`} />
            <Stat label="মোট কাস্টমার" value={`${cs.length} জন`} />
            {adv.length > 0 && <Stat label="অগ্রিম" value={money(cur, adv.reduce((s, c) => s + c.bal, 0))} color={t.green} />}
          </View>
        </View>

        <Section>নতুন এন্ট্রি</Section>
        <Group>
          <Segmented options={TYPES} value={type} onChange={setType} />
          <Field label="কাস্টমার" placeholder="নাম" value={name} onChangeText={setName} autoCorrect={false} returnKeyType="next" />
          {suggestions.length > 0 && (
            <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
              {suggestions.map(c => (
                <Pressable key={c.k} onPress={() => setName(c.name)} style={{ backgroundColor: t.fill, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 }}>
                  <T style={{ fontSize: 15 }}>{c.name}</T>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <Sep />
          <Field label="পরিমাণ" placeholder="0" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Sep />
          <Field label="নোট" placeholder="ঐচ্ছিক" value={note} onChangeText={setNote} returnKeyType="done" onSubmitEditing={save} />
          <View style={{ padding: 16, paddingTop: 12 }}>
            <Btn title="যোগ করুন" color={type === 'জমা' ? t.green : undefined} onPress={save} busy={busy} />
          </View>
        </Group>

        <Section>কাস্টমার</Section>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.fill, borderRadius: 10, paddingHorizontal: 10, height: 38, marginBottom: 10 }}>
          <T style={{ color: t.sub, fontSize: 15, marginRight: 6 }}>🔍</T>
          <TextInput value={q} onChangeText={setQ} placeholder="খুঁজুন" placeholderTextColor={t.sub} style={{ flex: 1, fontFamily: font.regular, fontSize: 17, color: t.text, paddingVertical: 0 }} />
        </View>
        <Group>
          {!loaded ? (
            <View style={{ padding: 28 }}><ActivityIndicator color={t.sub} /></View>
          ) : list.length === 0 ? (
            <T style={{ padding: 28, textAlign: 'center', color: t.sub, fontSize: 15 }}>
              {entries.length ? 'কিছু পাওয়া যায়নি' : 'এখনো কোনো এন্ট্রি নেই।\nউপরে প্রথম বাকি যোগ করুন।'}
            </T>
          ) : list.map((c, i) => {
            const s = status(c.bal);
            return (
              <View key={c.k}>
                {i > 0 && <Sep inset={68} />}
                <Pressable onPress={() => setOpen(c.k)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: pressed ? t.fill : 'transparent' })}>
                  <Avatar name={c.name} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T numberOfLines={1}>{c.name}</T>
                    <T style={{ fontSize: 13, color: t.sub }}>{c.rows.length}টি লেনদেন · {day(c.last)}</T>
                  </View>
                  <T w="semibold" style={{ color: s === 'due' ? t.red : s === 'adv' ? t.green : t.sub, fontSize: 16 }}>
                    {s === 'clear' ? 'পরিশোধিত' : (s === 'adv' ? 'অগ্রিম ' : '') + money(cur, c.bal)}
                  </T>
                  <T style={{ color: t.sub, fontSize: 22 }}>›</T>
                </Pressable>
              </View>
            );
          })}
        </Group>
      </ScrollView>

      <CustomerModal k={open} onClose={() => setOpen(null)} />
      <SettingsModal visible={settings} onClose={() => setSettings(false)} />
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const t = useTheme();
  return (
    <View>
      <T w="medium" style={{ fontSize: 13, color: t.sub }}>{label}</T>
      <T w="semibold" style={[{ fontSize: 17 }, color ? { color } : null]}>{value}</T>
    </View>
  );
}
