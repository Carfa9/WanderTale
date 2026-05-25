import {Platform} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = 'wandertale_access_token';
const REFRESH_TOKEN_KEY = "wandertale_refresh_token";

const isWeb = Platform.OS === "web";

export async function saveTokens(accessToken: string, refreshToken: string) {
    if (isWeb) {
        await AsyncStorage.multiSet([
            [ACCESS_TOKEN_KEY, accessToken],
            [REFRESH_TOKEN_KEY, refreshToken],
        ]);
        return;
    }
    
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);    
}

export async function getAccessToken() {
    if (isWeb) {
        return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);   
}

export async function getRefreshToken() {
    if (isWeb) {
        return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);  
}

export async function clearTokens() {
    if (isWeb) {
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
        return;
    }
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY); 
}