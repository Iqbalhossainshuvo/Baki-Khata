import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

// drive.file: the app can only see/edit files it created itself — the user's
// other Drive files stay private, and it is a non-sensitive scope.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

export type Profile = { name: string; email: string; photo: string | null };

export function configureGoogle() {
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

/** Human-readable message including the native error code, for toasts and banners. */
export function errorText(e: unknown): string {
  if (isErrorWithCode(e)) {
    if (e.code === '10' || /DEVELOPER_ERROR/.test(e.message)) {
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

/** Restores a previous session without UI; null when the user must sign in. */
export async function restoreSession(): Promise<Profile | null> {
  if (!GoogleSignin.hasPreviousSignIn()) return null;
  const res = await withTimeout(GoogleSignin.signInSilently(), 15000, 'Google');
  return res.type === 'success' ? toProfile(res.data.user) : null;
}

/** One-tap Google sign in. Returns null if the user cancelled. */
export async function signIn(): Promise<Profile | null> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return null;
    // Older accounts may have skipped the Drive checkbox — ask again for it.
    if (!SCOPES.every(s => res.data.scopes.includes(s))) {
      const more = await GoogleSignin.addScopes({ scopes: SCOPES });
      // Android resolves `true`, iOS a sign-in response.
      const ok = (more as unknown) === true || (!!more && isSuccessResponse(more));
      if (!ok) throw new Error('Google Drive-এর অনুমতি ছাড়া খাতা রাখা যাবে না');
    }
    return toProfile(res.data.user);
  } catch (e) {
    if (isErrorWithCode(e)) {
      // Cancelled, or superseded by a newer tap on the sign-in button.
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS || e.code === 'ASYNC_OP_IN_PROGRESS') return null;
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Google Play Services পাওয়া যায়নি');
    }
    throw new Error(errorText(e));
  }
}

export async function signOut() {
  cached = null;
  await GoogleSignin.signOut();
}

// The Android module can only run one getTokens() at a time — a second call
// rejects the first — so share one in-flight request and reuse the token.
let cached: { token: string; at: number } | null = null;
let inflight: Promise<string> | null = null;
const TOKEN_TTL = 45 * 60 * 1000;

export function accessToken(): Promise<string> {
  if (cached && Date.now() - cached.at < TOKEN_TTL) return Promise.resolve(cached.token);
  if (!inflight) {
    inflight = withTimeout(GoogleSignin.getTokens(), 120000, 'Google টোকেন')
      .then(t => {
        cached = { token: t.accessToken, at: Date.now() };
        return t.accessToken;
      })
      .catch(e => { throw new Error(errorText(e)); })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export async function dropToken(token: string) {
  cached = null;
  await GoogleSignin.clearCachedAccessToken(token);
}
