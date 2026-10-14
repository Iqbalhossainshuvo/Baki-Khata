export type EntryType = 'বাকি' | 'জমা';

export type Entry = {
  id: string;
  date: number; // epoch ms
  customer: string;
  type: EntryType;
  amount: number;
  note: string;
};

export type Customer = {
  k: string;
  name: string;
  bal: number; // > 0: they owe us, < 0: advance paid
  last: number;
  rows: Entry[];
};

export const EPS = 0.0001;
export const key = (s: string) => s.trim().toLowerCase();
export const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);

export function customers(data: Entry[]): Customer[] {
  const m = new Map<string, Customer>();
  for (const r of data) {
    const k = key(r.customer);
    let c = m.get(k);
    if (!c) m.set(k, (c = { k, name: r.customer, bal: 0, last: 0, rows: [] }));
    c.bal += r.type === 'জমা' ? -r.amount : r.amount;
    c.rows.push(r);
    if (r.date > c.last) c.last = r.date;
  }
  return [...m.values()].sort(
    (a, b) => Number(b.bal > EPS) - Number(a.bal > EPS) || b.bal - a.bal || a.name.localeCompare(b.name),
  );
}

export const status = (bal: number) => (bal > EPS ? 'due' : bal < -EPS ? 'adv' : 'clear');

export const CURRENCIES = ['SAR', '৳', '₹', '$', 'AED', 'QAR', 'KWD', 'MYR', 'RM'];

export const money = (cur: string, n: number) =>
  `${cur} ${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function day(ms: number) {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function dayTime(ms: number) {
  if (!ms) return '';
  const d = new Date(ms);
  const h = d.getHours() % 12 || 12;
  return `${day(ms)}, ${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

const COLORS = ['#ff9500', '#ff2d55', '#5856d6', '#007aff', '#34c759', '#af52de', '#5ac8fa', '#ff3b30', '#a2845e'];
export function avatarColor(s: string) {
  let h = 0;
  for (const c of key(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}
export const initial = (s: string) => ([...s.trim()][0] || '?').toUpperCase();
