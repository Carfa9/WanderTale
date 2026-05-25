import {api_url} from "@/api/config";
import {getStoredAuthSession, refreshStoredAuthSession} from "@/auth/auth-storage";

type ApiFetchOptions = RequestInit & {
    timeoutMs?: number;
    skipAuthRefresh?: boolean;
};

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly body: string
    ) {
        super(message);
        this.name = "ApiError";
    }
}

function buildUrl(path: string): string {
    if (/^https?:\/\//.test(path)) {
        return path;
    }

    return `${api_url}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const {timeoutMs = 4000, skipAuthRefresh = false, ...requestOptions} = options;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const session = await getStoredAuthSession();
    const headers = new Headers(requestOptions.headers);

    if (session?.token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${session.token}`);
    }

    try {
        let response = await fetch(buildUrl(path), {
            ...requestOptions,
            headers,
            signal: controller.signal,
        });

        if (response.status === 401 && !skipAuthRefresh) {
            const refreshed = await refreshStoredAuthSession();

            if (refreshed?.token) {
                headers.set("Authorization", `Bearer ${refreshed.token}`);
                response = await fetch(buildUrl(path), {
                    ...requestOptions,
                    headers,
                    signal: controller.signal,
                });
            }
        }

        const text = await response.text();

        if (!response.ok) {
            throw new ApiError(text || `HTTP ${response.status}`, response.status, text);
        }

        return text ? JSON.parse(text) : (undefined as T);
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error(`Request timed out after ${timeoutMs}ms`);
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
