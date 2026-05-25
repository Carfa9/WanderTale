import {apiFetch} from "@/api/http";
import {AuthSession, getStoredAuthSession} from "@/auth/auth-storage";

type AuthResponse = {
    token: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    email: string;
    name: string;
};

export async function login(email: string, password: string): Promise<AuthSession> {
    return apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email, password}),
    });
}

export async function register(name: string, email: string, password: string): Promise<AuthSession> {
    return apiFetch<AuthResponse>("/auth/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, email, password}),
    });
}

export async function logout(): Promise<void> {
    const session = await getStoredAuthSession();
    if (!session?.refreshToken) return;

    await apiFetch<void>("/auth/logout", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({refreshToken: session.refreshToken}),
        skipAuthRefresh: true,
    });
}
