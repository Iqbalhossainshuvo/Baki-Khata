import { createContext, useContext } from 'react';

export const SignOutCtx = createContext<() => void>(() => {});
export const useSignOut = () => useContext(SignOutCtx);
