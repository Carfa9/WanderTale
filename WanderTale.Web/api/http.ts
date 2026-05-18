import { api_url } from "@/api/config";

export async function apiFetch<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
        const response = await fetch(`${api_url}${path}`, {
            ...options,
            signal: controller.signal,
        });

        const text = await response.text();

        if (!response.ok) {
            throw new Error(text || `HTTP ${response.status}`);
        }

        return text ? JSON.parse(text) : (undefined as T);
    } finally {
        clearTimeout(timeout);
    }
}