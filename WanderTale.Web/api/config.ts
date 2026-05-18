import Constants from "expo-constants";

function normalizeApiUrl(value: string | undefined): string {
    const apiUrl = value?.trim().replace(/\/+$/, "");

    if (!apiUrl) {
        throw new Error(
            "Missing API URL. Set EXPO_PUBLIC_API_URL in WanderTale.Web/.env or your deployment environment."
        );
    }

    return apiUrl;
}

const configuredApiUrl =
    process.env.EXPO_PUBLIC_API_URL ??
    Constants.expoConfig?.extra?.apiUrl;

export const api_url = normalizeApiUrl(configuredApiUrl);
