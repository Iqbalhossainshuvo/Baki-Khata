import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { customers, dayTime, money, status, type Customer, type EntryType } from '../ledger';
import { useStore } from '../store';
import { useTheme } from '../theme';
import { Avatar, Btn, Field, Group, Section, Sep, T, ToastProvider, useToast } from '../ui';

export function CustomerModal({ k, onClose }: { k: string | null; onClose: () => void }) {
  const t = useTheme();
  const { entries } = useStore();
  const live = useMemo(() => (k ? customers(entries).find(c => c.k === k) : undefined), [entries, k]);
  // Keep the last customer on screen while the sheet slides away.
  const last = useRef<Customer | undefined>(undefined);
  if (live) last.current = live;
  const c = k ? live : last.current;

  // The last entry of this customer was deleted — nothing left to show.
  useEffect(() => { if (k && !live) onClose(); }, [k, live, onClose]);

  return (
    <Modal visible={!!k && !!live} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ToastProvider>
        <SafeAreaView edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']} style={{ flex: 1, backgroundColor: t.bg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 12 }}>
            <Pressable onPress={onClose} hitSlop={12}><T w="semibold" style={{ color: t.blue }}>সম্পন্ন</T></Pressable>
          </View>
          {c && <Body c={c} />}
        </SafeAreaView>
      </ToastProvider>
    </Modal>
  );
}

function Body({ c }: { c: Customer }) {
  const t = useTheme();
  const toast = useToast();
  const { cur, add, remove } = useStore();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<EntryType | null>(null);
  const s = status(c.bal);
  const rows = useMemo(() => c.rows.slice().sort((a, b) => b.date - a.date), [c.rows]);

  const save = async (type: EntryType) => {
    const amt = parseFloat(amount);
    if (!(amt > 0)) return toast('পরিমাণ লিখুন');
    const keep = { amount, note };
    setBusy(type);
    const p = add({ customer: c.name, type, amount: amt, note: note.trim() });
    setAmount(''); setNote('');
    toast(type === 'জমা' ? 'জমা হয়েছে ✓' : 'বাকি যোগ হয়েছে ✓');
    try {
      await p;
    } catch (e) {
      setAmount(keep.amount); setNote(keep.note);
      toast('⚠️ সেভ হয়নি: ' + (e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  };

  const del = (id: string) =>
    Alert.alert('এন্ট্রি মুছবেন?', 'এটি Google Sheet থেকেও মুছে যাবে।', [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'মুছুন', style: 'destructive',
        onPress: () => remove(id).then(() => toast('মুছে ফেলা হয়েছে'), e => toast('⚠️ ' + (e instanceof Error ? e.message : e))),
      },
    ]);

  const remind = () =>
    Share.share({ message: `আসসালামু আলাইকুম ${c.name}, আপনার কাছে বাকি আছে ${money(cur, c.bal)}। সুবিধামতো পরিশোধ করার অনুরোধ রইল। ধন্যবাদ।` });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 40, maxWidth: 600, width: '100%', alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <Avatar name={c.name} size={68} />
          <T w="bold" style={{ fontSize: 24, marginTop: 10, lineHeight: 34 }}>{c.name}</T>
          <T w="medium" style={{ fontSize: 13, color: t.sub, marginTop: 8 }}>{s === 'adv' ? 'অগ্রিম জমা' : 'মোট বাকি'}</T>
          <T w="bold" style={{ fontSize: 34, lineHeight: 48, color: s === 'due' ? t.red : s === 'adv' ? t.green : t.text }}>{money(cur, c.bal)}</T>
          {s === 'due' && (
            <Pressable onPress={remind} style={{ marginTop: 8, backgroundColor: t.fill, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 }}>
              <T w="medium" style={{ fontSize: 14, color: t.blue }}>📨 রিমাইন্ডার পাঠান</T>
            </Pressable>
          )}
        </View>

        <Group>
          <Field label="পরিমাণ" placeholder="0" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Sep />
          <Field label="নোট" placeholder="ঐচ্ছিক" value={note} onChangeText={setNote} />
          <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingTop: 12 }}>
            <Btn style={{ flex: 1 }} title="+ বাকি" color={t.red} onPress={() => save('বাকি')} busy={busy === 'বাকি'} disabled={!!busy} />
            <Btn style={{ flex: 1 }} title="− জমা" color={t.green} onPress={() => save('জমা')} busy={busy === 'জমা'} disabled={!!busy} />
          </View>
        </Group>

        <Section>ইতিহাস</Section>
        <Group>
          {rows.map((r, i) => (
            <View key={r.id}>
              {i > 0 && <Sep />}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 8, paddingVertical: 10 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T style={{ fontSize: 16 }} numberOfLines={2}>{r.type === 'জমা' ? 'টাকা পেলাম' : 'বাকি দিলাম'}{r.note ? ' · ' + r.note : ''}</T>
                  <T style={{ fontSize: 13, color: t.sub }}>{dayTime(r.date)}</T>
                </View>
                <T w="semibold" style={{ fontSize: 16, color: r.type === 'জমা' ? t.green : t.red }}>{r.type === 'জমা' ? '−' : '+'}{money(cur, r.amount)}</T>
                <Pressable onPress={() => del(r.id)} hitSlop={8} style={{ padding: 6 }}>
                  <T style={{ color: t.sub, fontSize: 16 }}>✕</T>
                </Pressable>
              </View>
            </View>
          ))}
        </Group>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
