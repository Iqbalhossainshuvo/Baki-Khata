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

const toProfile = (u: { name: string | null; email: string; photo: string | null }): Profile => ({
  name: u.name || u.email.split('@')[0],
  email: u.email,
  photo: u.photo,
});

/** Restores a previous session without UI; null when the user must sign in. */
export async function restoreSession(): Promise<Profile | null> {
  if (!GoogleSignin.hasPreviousSignIn()) return null;
  const res = await GoogleSignin.signInSilently();
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
      if (!more || !isSuccessResponse(more)) throw new Error('Google Drive-এর অনুমতি ছাড়া খাতা রাখা যাবে না');
    }
    return toProfile(res.data.user);
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.IN_PROGRESS) return null;
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Google Play Services পাওয়া যায়নি');
    }
    throw e;
  }
}

export async function signOut() {
  await GoogleSignin.signOut();
}

export async function accessToken(): Promise<string> {
  return (await GoogleSignin.getTokens()).accessToken;
}

export async function dropToken(token: string) {
  await GoogleSignin.clearCachedAccessToken(token);
}
