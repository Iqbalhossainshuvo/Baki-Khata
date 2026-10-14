import { createContext, useContext } from 'react';

type Auth = {
  signOut: () => void;
  /** Guest only: sign in with Google and move this phone's entries to the user's sheet. */
  connectGoogle: () => Promise<void>;
};

export const AuthCtx = createContext<Auth>({ signOut: () => {}, connectGoogle: async () => {} });
export const useAuth = () => useContext(AuthCtx);
