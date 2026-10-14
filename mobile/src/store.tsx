import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Profile } from './google';
import { uid, type Entry, type EntryType } from './ledger';
import { appendEntry, deleteEntry, listEntries, openBook, type Book } from './sheets';

type Store = {
  profile: Profile;
  book: Book | null;
  entries: Entry[];
  loaded: boolean;
  syncing: boolean;
  error: string;
  cur: string;
  setCur: (c: string) => void;
  refresh: () => Promise<void>;
  add: (e: { customer: string; type: EntryType; amount: number; note: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx)!;

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function StoreProvider({ profile, children }: { profile: Profile; children: ReactNode }) {
  const cacheKey = `entries:${profile.email}`;
  const [book, setBook] = useState<Book | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [error, setError] = useState('');
  const [cur, setCurState] = useState('SAR');
  const bookRef = useRef<Book | null>(null);

  const save = useCallback((list: Entry[]) => {
    setEntries(list);
    AsyncStorage.setItem(cacheKey, JSON.stringify(list)).catch(() => {});
  }, [cacheKey]);

  const getBook = useCallback(async () => {
    if (!bookRef.current) {
      bookRef.current = await openBook();
      setBook(bookRef.current);
    }
    return bookRef.current;
  }, []);

  const guest = !!profile.guest;

  const refresh = useCallback(async () => {
    if (guest) { setSyncing(false); setLoaded(true); return; }
    setSyncing(true);
    try {
      save(await listEntries(await getBook()));
      setError('');
    } catch (e) {
      setError(msg(e));
      throw e;
    } finally {
      setSyncing(false);
      setLoaded(true);
    }
  }, [guest, getBook, save]);

  useEffect(() => {
    (async () => {
      try {
        const [cached, c] = await Promise.all([AsyncStorage.getItem(cacheKey), AsyncStorage.getItem('currency')]);
        if (c) setCurState(c);
        if (cached) { setEntries(JSON.parse(cached)); setLoaded(true); }
      } catch {}
      refresh().catch(() => {});
    })();
  }, [cacheKey, refresh]);

  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  // Optimistic: show the change instantly, roll back if Google rejects it.
  const add: Store['add'] = useCallback(async e => {
    const entry: Entry = { ...e, id: uid(), date: Date.now() };
    save([...entriesRef.current, entry]);
    if (guest) return;
    try {
      await appendEntry(await getBook(), entry);
    } catch (err) {
      save(entriesRef.current.filter(x => x.id !== entry.id));
      throw err;
    }
  }, [guest, getBook, save]);

  const remove: Store['remove'] = useCallback(async id => {
    const before = entriesRef.current;
    save(before.filter(x => x.id !== id));
    if (guest) return;
    try {
      await deleteEntry(await getBook(), id);
    } catch (err) {
      save(before);
      throw err;
    }
  }, [guest, getBook, save]);

  const setCur = useCallback((c: string) => {
    setCurState(c);
    AsyncStorage.setItem('currency', c).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ profile, book, entries, loaded, syncing, error, cur, setCur, refresh, add, remove }),
    [profile, book, entries, loaded, syncing, error, cur, setCur, refresh, add, remove],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
