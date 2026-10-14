// ===== বাকি খাতা — Google Apps Script =====
const SHEET_NAME = 'Transactions';
const SUMMARY_NAME = 'Summary';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('বাকি খাতা')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSpreadsheet_() {
  let ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (ss) return ss;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('বাকি খাতা');
    props.setProperty('SHEET_ID', ss.getId());
  }
  return ss;
}

function getSheet_() {
  const ss = getSpreadsheet_();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME, 0);
    sh.appendRow(['তারিখ', 'কাস্টমার', 'ধরন', 'পরিমাণ', 'নোট', 'ID']);
    sh.setFrozenRows(1);
    sh.getRange('A1:F1').setFontWeight('bold');
    sh.getRange('A:A').setNumberFormat('dd-mm-yyyy hh:mm');
    const def = ss.getSheetByName('Sheet1');
    if (def && def.getLastRow() === 0) ss.deleteSheet(def);
  }
  if (!ss.getSheetByName(SUMMARY_NAME)) {
    const sm = ss.insertSheet(SUMMARY_NAME);
    sm.getRange('A1:B1').setValues([['কাস্টমার', 'মোট বাকি']]).setFontWeight('bold');
    sm.getRange('A2').setFormula('=SORT(UNIQUE(FILTER(Transactions!B2:B,Transactions!B2:B<>"")))');
    sm.getRange('B2').setFormula('=ARRAYFORMULA(IF(A2:A="",,SUMIFS(Transactions!D:D,Transactions!B:B,A2:A,Transactions!C:C,"বাকি")-SUMIFS(Transactions!D:D,Transactions!B:B,A2:A,Transactions!C:C,"জমা")))');
    sm.setFrozenRows(1);
  }
  return sh;
}

function getData() {
  const sh = getSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 6).getValues()
    .filter(r => String(r[1]).trim() !== '')
    .map(r => ({
      date: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      customer: String(r[1]).trim(),
      type: String(r[2]),
      amount: Number(r[3]) || 0,
      note: String(r[4] || ''),
      id: String(r[5])
    }));
}

function addEntry(e) {
  const name = String(e.customer || '').trim();
  const amount = Number(e.amount);
  if (!name) throw new Error('কাস্টমারের নাম দিন');
  if (!(amount > 0)) throw new Error('সঠিক পরিমাণ দিন');
  const type = e.type === 'জমা' ? 'জমা' : 'বাকি';
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet_().appendRow([new Date(), name, type, amount, String(e.note || ''), Utilities.getUuid()]);
  } finally { lock.releaseLock(); }
  return getData();
}

function deleteEntry(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = getSheet_();
    const last = sh.getLastRow();
    if (last >= 2) {
      const ids = sh.getRange(2, 6, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === String(id)) { sh.deleteRow(i + 2); break; }
      }
    }
  } finally { lock.releaseLock(); }
  return getData();
}

function getSheetUrl() {
  return getSpreadsheet_().getUrl();
}
