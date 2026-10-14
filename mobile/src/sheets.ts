// The ledger is a Google Sheet in the signed-in user's own Drive.
// Each account gets its own "বাকি খাতা" spreadsheet, created on first sign in.
import { accessToken, dropToken } from './google';
import type { Entry, EntryType } from './ledger';

const DRIVE = 'https://www.googleapis.com/drive/v3/files';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const TX_ID = 0; // sheetId of the transactions tab
const HEAD = ['তারিখ', 'কাস্টমার', 'ধরন', 'পরিমাণ', 'নোট', 'ID'];

export type Book = { id: string; url: string; tab: string };

async function req<T = any>(url: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = await accessToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
  } catch {
    throw new Error('ইন্টারনেট সংযোগ পাওয়া যায়নি');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401 && retry) {
    await dropToken(token);
    return req<T>(url, init, false);
  }
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json()).error.message; } catch {}
    throw new Error(msg || `সার্ভার সমস্যা (${res.status})`);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

const enc = encodeURIComponent;
const range = (b: Book, r: string) => enc(`'${b.tab.replace(/'/g, "''")}'!${r}`);

// Sheets serial dates count days since 1899-12-30 in local wall-clock time.
const tz = () => new Date().getTimezoneOffset() * 60000;
const toSerial = (ms: number) => (ms - tz()) / 86400000 + 25569;
const fromSerial = (s: number) => (s - 25569) * 86400000 + tz();

async function createBook(): Promise<string> {
  const cell = (v: string, bold = false) => ({
    userEnteredValue: v.startsWith('=') ? { formulaValue: v } : { stringValue: v },
    ...(bold ? { userEnteredFormat: { textFormat: { bold: true } } } : {}),
  });
  const ss = await req<{ spreadsheetId: string }>(SHEETS, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: 'বাকি খাতা', locale: 'en_US' },
      sheets: [
        {
          properties: { sheetId: TX_ID, title: 'Transactions', gridProperties: { frozenRowCount: 1 } },
          data: [{ startRow: 0, startColumn: 0, rowData: [{ values: HEAD.map(h => cell(h, true)) }] }],
        },
        {
          properties: { sheetId: 1, title: 'Summary', gridProperties: { frozenRowCount: 1 } },
          data: [{
            startRow: 0, startColumn: 0,
            rowData: [
              { values: [cell('কাস্টমার', true), cell('মোট বাকি', true)] },
              { values: [
                cell('=SORT(UNIQUE(FILTER(Transactions!B2:B,Transactions!B2:B<>"")))'),
                cell('=ARRAYFORMULA(IF(A2:A="",,SUMIFS(Transactions!D:D,Transactions!B:B,A2:A,Transactions!C:C,"বাকি")-SUMIFS(Transactions!D:D,Transactions!B:B,A2:A,Transactions!C:C,"জমা")))'),
              ] },
            ],
          }],
        },
      ],
    }),
  });
  const id = ss.spreadsheetId;
  await req(`${SHEETS}/${id}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{
        repeatCell: {
          range: { sheetId: TX_ID, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
          cell: { userEnteredFormat: { numberFormat: { type: 'DATE_TIME', pattern: 'dd-mm-yyyy hh:mm' } } },
          fields: 'userEnteredFormat.numberFormat',
        },
      }],
    }),
  });
  // Tag it so we can find it again on any device signed in to this account.
  await req(`${DRIVE}/${id}`, { method: 'PATCH', body: JSON.stringify({ appProperties: { bakiKhata: '1' } }) });
  return id;
}

/** Finds this account's ledger spreadsheet, creating it on first use. */
export async function openBook(): Promise<Book> {
  const q = enc("appProperties has { key='bakiKhata' and value='1' } and trashed=false");
  const found = await req<{ files: { id: string }[] }>(`${DRIVE}?q=${q}&orderBy=createdTime&pageSize=1&fields=files(id)`);
  const id = found.files[0]?.id ?? (await createBook());
  const meta = await req<{ spreadsheetUrl: string; sheets: { properties: { sheetId: number; title: string } }[] }>(
    `${SHEETS}/${id}?fields=spreadsheetUrl,sheets.properties(sheetId,title)`,
  );
  const tab = (meta.sheets.find(s => s.properties.sheetId === TX_ID) ?? meta.sheets[0]).properties.title;
  return { id, url: meta.spreadsheetUrl, tab };
}

export async function listEntries(b: Book): Promise<Entry[]> {
  const res = await req<{ values?: unknown[][] }>(
    `${SHEETS}/${b.id}/values/${range(b, 'A2:F')}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`,
  );
  return (res.values ?? [])
    .filter(r => String(r[1] ?? '').trim() !== '')
    .map((r, i) => ({
      date: typeof r[0] === 'number' ? fromSerial(r[0]) : Date.parse(String(r[0])) || 0,
      customer: String(r[1]).trim(),
      type: (r[2] === 'জমা' ? 'জমা' : 'বাকি') as EntryType,
      amount: Number(r[3]) || 0,
      note: String(r[4] ?? ''),
      id: String(r[5] || `row-${i}`),
    }));
}

export async function appendEntries(b: Book, list: Entry[]) {
  if (!list.length) return;
  await req(`${SHEETS}/${b.id}/values/${range(b, 'A:F')}:append?valueInputOption=RAW`, {
    method: 'POST',
    body: JSON.stringify({ values: list.map(e => [toSerial(e.date), e.customer, e.type, e.amount, e.note, e.id]) }),
  });
}

export async function appendEntry(b: Book, e: Entry) {
  await req(`${SHEETS}/${b.id}/values/${range(b, 'A:F')}:append?valueInputOption=RAW`, {
    method: 'POST',
    body: JSON.stringify({ values: [[toSerial(e.date), e.customer, e.type, e.amount, e.note, e.id]] }),
  });
}

export async function deleteEntry(b: Book, id: string) {
  // Re-read the ID column right before deleting so we never remove the wrong row.
  const res = await req<{ values?: unknown[][] }>(`${SHEETS}/${b.id}/values/${range(b, 'F2:F')}`);
  const idx = (res.values ?? []).findIndex(r => String(r[0] ?? '') === id);
  if (idx < 0) return;
  await req(`${SHEETS}/${b.id}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{ deleteDimension: { range: { sheetId: TX_ID, dimension: 'ROWS', startIndex: idx + 1, endIndex: idx + 2 } } }],
    }),
  });
}
