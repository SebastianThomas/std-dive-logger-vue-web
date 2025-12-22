"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { refreshAccessToken } from "../components/globals/auth/refreshToken";

export type LoggedInState = {
  loggedIn: true;
  accessToken: string;
  refreshing: boolean;
};
export type LoggedOutState = { loggedIn: false; refreshing: boolean };
export type AuthState = LoggedInState | LoggedOutState;

type AuthContextValue = {
  auth: AuthState;
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
};

type UseAuthType = {
  auth: AuthState;
  login: (token: string) => void;
  logout: () => void;
  setRefreshing: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [auth, setAuth] = useState<AuthState>({
    loggedIn: false,
    refreshing: false,
  });

  useEffect(() => {
    async function tryRefresh() {
      // Try to login initially, if a refresh is already in progress, just skip this.
      await new Promise((resolve) => setTimeout(resolve, 10));
      setAuth({ loggedIn: false, refreshing: true });
      const token = await refreshAccessToken();
      if (token) {
        setAuth({ loggedIn: true, accessToken: token, refreshing: false });
      } else {
        setAuth({ loggedIn: false, refreshing: false });
      }
    }
    if (!auth.loggedIn && !auth.refreshing) {
      tryRefresh();
    }
    return () => { };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ auth, setAuth }), [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): UseAuthType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return {
    auth: ctx.auth,
    login: (token) =>
      ctx.setAuth({ loggedIn: true, accessToken: token, refreshing: false }),
    logout: () => ctx.setAuth({ loggedIn: false, refreshing: false }),
    setRefreshing: () => ctx.setAuth({ ...ctx.auth, refreshing: true }),
  };
}

export default AuthContext;
