import {Stack, router, usePathname} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import 'react-native-reanimated';
import {SafeAreaProvider, useSafeAreaInsets} from "react-native-safe-area-context";
import {View, Pressable, StyleSheet} from "react-native";
import {useEffect, useState} from "react";
import {QueryClient} from "@tanstack/query-core";
import {QueryClientProvider} from "@tanstack/react-query";
import {Ionicons} from "@expo/vector-icons";
import {useFonts} from "expo-font";
import {IndieFlower_400Regular} from "@expo-google-fonts/indie-flower";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {ThemeProvider, useTheme} from "@/context/ThemeContext";
import {initializeLocalSchema} from "@/local/schema";
import {AuthProvider} from "@/context/AuthContext";

export default function RootLayout() {

    const [queryClient] = useState(() => new QueryClient());
    const [localDbReady, setLocalDbReady] = useState(false);

    const [fontsLoaded] = useFonts({
        IndieFlower: IndieFlower_400Regular,
    });

    useEffect(() => {
        let isMounted = true;

        initializeLocalSchema()
            .catch(() => {})
            .finally(() => {
                if (isMounted) setLocalDbReady(true);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    if (!fontsLoaded || !localDbReady) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>
                    <ThemeProvider>
                        <AuthProvider>
                            <Stack screenOptions={{headerShown: false}}/>
                            <ThemedStatusBar/>
                            <HomeOverlayButton/>
                        </AuthProvider>
                    </ThemeProvider>
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

function ThemedStatusBar() {
    const {theme} = useTheme();
    return <StatusBar style={theme.tokens.isDark ? 'light' : 'dark'}/>;
}

function HomeOverlayButton() {
    const insets = useSafeAreaInsets();
    const pathname = usePathname();
    const {theme} = useTheme();
    const tokens = theme.tokens;

    if (pathname === "/" || pathname.startsWith("/auth")) return null;

    return (
        <View
            pointerEvents="box-none"
            style={[
                styles.overlay,
                {top: insets.top + 8},
            ]}
        >
            <Pressable
                onPress={() => {
                    router.dismissAll();
                    router.replace("/");
                }}
                hitSlop={12}
                style={({pressed}) => [
                    styles.homeBtn,
                    {backgroundColor: tokens.background},
                    pressed && styles.homeBtnPressed,
                ]}
            >
                <Ionicons name="home-outline" size={24} color={tokens.textPrimary}/>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        left: 12,
        right: 12,

        zIndex: 1000,
        alignItems: "flex-end",
    },

    homeBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },

    homeBtnPressed: {
        opacity: 0.9,
        transform: [{scale: 0.98}],
    },
});
