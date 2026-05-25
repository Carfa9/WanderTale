import AsyncStorage from "@react-native-async-storage/async-storage";
import {api_url} from "@/api/config";
import {clearTokens, getAccessToken, getRefreshToken, saveTokens} from "@/auth/token-storage";

const SESSION_META_KEY = "wandertale_auth_session_meta";
const OLD_STORAGE_KEY = "wandertale_auth_session";

const sessionChangedListeners = new Set<(session: AuthSession | null) => void>();

export type AuthSession = {
    token: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    email: string;
    name: string;
};

type AuthSessionMeta = {
    accessTokenExpiresAt: string;
    email: string;
    name: string;
};

export async function getStoredAuthSession(): Promise<AuthSession | null> {
    const rawMeta = await AsyncStorage.getItem(SESSION_META_KEY);
    const token = await getAccessToken();
    const refreshToken = await getRefreshToken();
    
    if (!rawMeta || !token) {
        return await migrateLegacySession();
    }

    try {
        const parsed = JSON.parse(rawMeta) as Partial<AuthSessionMeta>;
        if (!parsed.email) return await migrateLegacySession();

        return {
            token,
            refreshToken: refreshToken ?? "",
            accessTokenExpiresAt: parsed.accessTokenExpiresAt ?? "",
            email: parsed.email,
            name: parsed.name ?? parsed.email,
        };
    } catch {
        return await migrateLegacySession();
    }
}

async function migrateLegacySession(): Promise<AuthSession | null> {
    const rawLegacySession = await AsyncStorage.getItem(OLD_STORAGE_KEY);
    if (!rawLegacySession) return null;

    try {
        const parsed = JSON.parse(rawLegacySession) as Partial<AuthSession>;
        if (!parsed.token || !parsed.refreshToken || !parsed.email) {
            await AsyncStorage.removeItem(OLD_STORAGE_KEY);
            return null;
        }

        const session: AuthSession = {
            token: parsed.token,
            refreshToken: parsed.refreshToken,
            accessTokenExpiresAt: parsed.accessTokenExpiresAt ?? "",
            email: parsed.email,
            name: parsed.name ?? parsed.email,
        };

        await storeAuthSession(session);
        await AsyncStorage.removeItem(OLD_STORAGE_KEY);
        return session;
    } catch {
        await AsyncStorage.removeItem(OLD_STORAGE_KEY);
        return null;
    }
}

export async function storeAuthSession(session: AuthSession): Promise<void> {
    await saveTokens(session.token, session.refreshToken);
    
    const meta : AuthSessionMeta = {
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        email: session.email,
        name: session.name,        
    };
    
    await AsyncStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
    
    sessionChangedListeners.forEach((listener) => listener(session));
}

export async function clearAuthSession(): Promise<void> {
    await clearTokens();
    
    await AsyncStorage.removeItem(SESSION_META_KEY);
    
    // Rensar gammal session från tidigare versionen där allt låg i AsyncStorage.
    await AsyncStorage.removeItem(OLD_STORAGE_KEY);
    
    sessionChangedListeners.forEach((listener) => listener(null));
}

export async function refreshStoredAuthSession(): Promise<AuthSession | null> {
    const current = await getStoredAuthSession();
    if (!current?.refreshToken) return null;

    const response = await fetch(`${api_url}/auth/refresh`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({refreshToken: current.refreshToken}),
    });

    if (!response.ok) {
        if (response.status === 401) {
            await clearAuthSession();
        }

        return null;
    }

    const next = await response.json() as AuthSession;
    await storeAuthSession(next);
    return next;
}

export function onAuthSessionChanged(listener: (session: AuthSession | null) => void): () => void {
    sessionChangedListeners.add(listener);
    return () => {
        sessionChangedListeners.delete(listener);
    };
}
