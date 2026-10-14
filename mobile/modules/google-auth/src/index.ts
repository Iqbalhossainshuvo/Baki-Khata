import { requireNativeModule } from 'expo';

type GoogleAuthNative = {
  authorize(scopes: string[], account: string | null, interactive: boolean): Promise<string | null>;
  clearToken(token: string): Promise<void>;
};

export default requireNativeModule<GoogleAuthNative>('GoogleAuth');
