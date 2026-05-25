import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {router, usePathname} from "expo-router";
import {
    AuthSession,
    clearAuthSession,
    getStoredAuthSession,
    onAuthSessionChanged,
    storeAuthSession,
    refreshStoredAuthSession,
} from "@/auth/auth-storage";
import {logout} from "@/api/auth";
import {claimUnownedLocalData, clearLocalUserData} from "@/local/account";

type AuthContextValue = {
    session: AuthSession | null;
    isLoading: boolean;
    signIn: (session: AuthSession) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [session, setSession] = useState<AuthSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        getStoredAuthSession()
            .then((stored) => {
                if (!isMounted) return;
                setSession(stored);
                if (stored?.email) {
                    void claimUnownedLocalData(stored.email);
                }
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        return onAuthSessionChanged((nextSession) => {
            setSession(nextSession);
            if (!nextSession) {
                router.replace("/auth/login");
            }
        });
    }, []);

    useEffect(() => {
        if (isLoading) return;

        const isAuthRoute = pathname.startsWith("/auth");

        if (!session && !isAuthRoute) {
            router.replace("/auth/login");
        } else if (session && isAuthRoute) {
            router.replace("/");
        }
    }, [isLoading, pathname, session]);

    useEffect(() => {
        if (!session?.accessTokenExpiresAt || !session.refreshToken) return;

        const expiresAt = new Date(session.accessTokenExpiresAt).getTime();
        const refreshInMs = Math.max(expiresAt - Date.now() - 60_000, 5_000);
        const timeout = setTimeout(() => {
            refreshStoredAuthSession().catch(() => {});
        }, refreshInMs);

        return () => clearTimeout(timeout);
    }, [session?.accessTokenExpiresAt, session?.refreshToken]);

    const signIn = useCallback(async (nextSession: AuthSession) => {
        await storeAuthSession(nextSession);
        await claimUnownedLocalData(nextSession.email);
        setSession(nextSession);
        router.replace("/");
    }, []);

    const signOut = useCallback(async () => {
        try {
            await logout();
        } catch {
            // Local logout still needs to complete when the device is offline.
        }

        await clearLocalUserData();
        await clearAuthSession();
        setSession(null);
        router.replace("/auth/login");
    }, []);

    const value = useMemo<AuthContextValue>(() => ({
        session,
        isLoading,
        signIn,
        signOut,
    }), [session, isLoading, signIn, signOut]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
