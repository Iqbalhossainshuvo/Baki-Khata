import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

// drive.file: the app can only see/edit files it created itself — the user's
// other Drive files stay private, and it is a non-sensitive scope.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Android uses Google Identity Services' AuthorizationClient (local module in
// modules/google-auth); the legacy GoogleSignIn dialog can hang forever on
// current Play services. iOS keeps the GoogleSignIn SDK.
const android = Platform.OS === 'android';
const GoogleAuth = android ? (require('../modules/google-auth/src').default as typeof import('../modules/google-auth/src').default) : null;

export type Profile = { name: string; email: string; photo: string | null };

const PROFILE_KEY = 'googleProfile';

export function configureGoogle() {
  if (android) return;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: SCOPES,
  });
}

/** Rejects if `p` hasn't settled after `ms`, so the UI never spins forever. */
export function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} — সময়মতো সাড়া পাওয়া যায়নি, আবার চেষ্টা করুন`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

const isCancel = (e: unknown) =>
  isErrorWithCode(e) &&
  [statusCodes.SIGN_IN_CANCELLED, statusCodes.IN_PROGRESS, 'ASYNC_OP_IN_PROGRESS', 'CANCELLED', 'SUPERSEDED'].includes(e.code);

/** Human-readable message including the native error code, for toasts and banners. */
export function errorText(e: unknown): string {
  if (isErrorWithCode(e)) {
    if (e.code === '10' || e.code === 'GOOGLE_10' || /DEVELOPER_ERROR/.test(e.message)) {
      return 'DEVELOPER_ERROR — Google Cloud-এর Android client-এ package name বা SHA-1 মেলেনি';
    }
    return `${e.message} (${e.code})`;
  }
  return e instanceof Error ? e.message : String(e);
}

const toProfile = (u: { name: string | null; email: string; photo: string | null }): Profile => ({
  name: u.name || u.email.split('@')[0],
  email: u.email,
  photo: u.photo,
});

async function fetchDriveUser(token: string): Promise<Profile> {
  const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink)', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Google অ্যাকাউন্টের তথ্য পাওয়া যায়নি (${res.status})`);
  const { user } = await res.json();
  return toProfile({ name: user.displayName ?? null, email: user.emailAddress, photo: user.photoLink ?? null });
}

/** Restores a previous session without UI; null when the user must sign in. */
export async function restoreSession(): Promise<Profile | null> {
  if (android) {
    const saved = await AsyncStorage.getItem(PROFILE_KEY);
    return saved ? (JSON.parse(saved) as Profile) : null;
  }
  if (!GoogleSignin.hasPreviousSignIn()) return null;
  const res = await withTimeout(GoogleSignin.signInSilently(), 15000, 'Google');
  return res.type === 'success' ? toProfile(res.data.user) : null;
}

/** One-tap Google sign in. Returns null if the user cancelled. */
export async function signIn(): Promise<Profile | null> {
  try {
    if (android) {
      const token = await GoogleAuth!.authorize(SCOPES, null, true);
      if (!token) return null;
      const profile = await fetchDriveUser(token);
      cached = { token, at: Date.now() };
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      return profile;
    }
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return null;
    // Older accounts may have skipped the Drive checkbox — ask again for it.
    if (!SCOPES.every(s => res.data.scopes.includes(s))) {
      const more = await GoogleSignin.addScopes({ scopes: SCOPES });
      if (!more || !isSuccessResponse(more)) throw new Error('Google Drive-এর অনুমতি ছাড়া খাতা রাখা যাবে না');
    }
    return toProfile(res.data.user);
  } catch (e) {
    if (isCancel(e)) return null;
    if (isErrorWithCode(e) && e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Google Play Services পাওয়া যায়নি');
    throw new Error(errorText(e));
  }
}

export async function signOut() {
  const token = cached?.token;
  cached = null;
  if (android) {
    await AsyncStorage.removeItem(PROFILE_KEY);
    if (token) await GoogleAuth!.clearToken(token).catch(() => {});
    return;
  }
  await GoogleSignin.signOut();
}

// Share one in-flight token request and reuse the token until it nears expiry
// (the legacy Android module also rejects overlapping getTokens() calls).
let cached: { token: string; at: number } | null = null;
let inflight: Promise<string> | null = null;
const TOKEN_TTL = 45 * 60 * 1000;

async function fetchToken(): Promise<string> {
  if (android) {
    const saved = await AsyncStorage.getItem(PROFILE_KEY);
    const email = saved ? (JSON.parse(saved) as Profile).email : null;
    // Silent first; only show Google's screen if consent is needed again.
    const token =
      (await GoogleAuth!.authorize(SCOPES, email, false)) ?? (await GoogleAuth!.authorize(SCOPES, email, true));
    if (!token) throw new Error('Google অনুমতি পাওয়া যায়নি');
    return token;
  }
  return (await GoogleSignin.getTokens()).accessToken;
}

export function accessToken(): Promise<string> {
  if (cached && Date.now() - cached.at < TOKEN_TTL) return Promise.resolve(cached.token);
  if (!inflight) {
    inflight = withTimeout(fetchToken(), 120000, 'Google টোকেন')
      .then(token => {
        cached = { token, at: Date.now() };
        return token;
      })
      .catch(e => { throw new Error(errorText(e)); })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export async function dropToken(token: string) {
  cached = null;
  if (android) await GoogleAuth!.clearToken(token);
  else await GoogleSignin.clearCachedAccessToken(token);
}
