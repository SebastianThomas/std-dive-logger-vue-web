"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { refreshAccessToken } from "../app/helper/auth/refreshToken";

export type LoggedInState = { loggedIn: true, accessToken: string, refreshing: boolean };
export type LoggedOutState = { loggedIn: false, refreshing: boolean };
export type AuthState = LoggedInState | LoggedOutState;

type AuthContextValue = {
    auth: AuthState;
    setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
    //ready: boolean;
};

type UseAuthType = {
    auth: AuthState,
    login: (token: string) => void,
    logout: () => void,
    setRefreshing: () => void,
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [auth, setAuth] = useState<AuthState>({ loggedIn: false, refreshing: false });
    //const [ready, setReady] = useState(false);

    useEffect(() => {
        async function tryRefresh() {
            // Try to login initially, if a refresh is already in progress, just skip this.
            if (auth.loggedIn || auth.refreshing) return;
            await new Promise(resolve => setTimeout(resolve, 300));
            setAuth({ loggedIn: false, refreshing: true });
            const token = await refreshAccessToken();
            if (token) {
                setAuth({ loggedIn: true, accessToken: token, refreshing: false });
            } else {
                setAuth({ loggedIn: false, refreshing: false })
            }
            //setReady(true);
        }
        tryRefresh();
        return () => { };
    }, []);

    const value = useMemo(() => ({ auth, /*ready,*/ setAuth }), [auth, /*ready*/]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): UseAuthType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return {
        auth: ctx.auth,
        login: token => ctx.setAuth({ loggedIn: true, accessToken: token, refreshing: false }),
        logout: () => ctx.setAuth({ loggedIn: false, refreshing: false }),
        setRefreshing: () => ctx.setAuth({ ...ctx.auth, refreshing: true }),
    };
}

export default AuthContext;
