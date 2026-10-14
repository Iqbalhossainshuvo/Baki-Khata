# Baki-Khata

বাকি খাতা — a simple credit ledger (who owes how much) built on Google Apps Script, with Google Sheets as the database.

## Files

- `Code.gs` — server side: serves the web app and reads/writes the `Transactions` sheet (also creates a `Summary` sheet with per-customer totals).
- `Index.html` — the mobile-friendly UI (add বাকি / জমা, customer list, per-customer history, delete entries).

## Setup

1. Open a Google Sheet → **Extensions → Apps Script** (or create a standalone script at script.google.com; a new sheet named "বাকি খাতা" is then created automatically).
2. Paste `Code.gs` into the default script file.
3. Add an HTML file named `Index` and paste `Index.html` into it.
4. **Deploy → New deployment → Web app**, execute as *Me*, choose who has access, and deploy.
5. Open the web app URL (add it to your phone's home screen for an app-like feel).

The currency label is set by `CUR` at the top of the script in `Index.html` (default `SAR`).
