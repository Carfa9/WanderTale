import {DarkTheme, DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {Stack, router, usePathname} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import 'react-native-reanimated';
import {SafeAreaProvider, useSafeAreaInsets} from "react-native-safe-area-context";
import {View, Pressable, StyleSheet} from "react-native";
import {useState} from "react";
import {QueryClient} from "@tanstack/query-core";
import {QueryClientProvider} from "@tanstack/react-query";
import {Ionicons} from "@expo/vector-icons";
import {useFonts} from "expo-font";
import {IndieFlower_400Regular} from "@expo-google-fonts/indie-flower";
import {GestureHandlerRootView} from "react-native-gesture-handler";

export default function RootLayout() {

    const [queryClient] = useState(() => new QueryClient());

    const [fontsLoaded] = useFonts({
        IndieFlower: IndieFlower_400Regular,
    });

    if (!fontsLoaded) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>

                    <Stack screenOptions={{headerShown: false}}/>

                    <StatusBar style="auto"/>
                    <HomeOverlayButton/>
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

function HomeOverlayButton() {
    const insets = useSafeAreaInsets();
    const pathname = usePathname();

    if (pathname === "/") return null;

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
                style={({pressed}) => [styles.homeBtn, pressed && styles.homeBtnPressed]}
            >
                <Ionicons name="home-outline" size={24} color="#111"/>
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
        backgroundColor: "#F5EDE4",
    },

    homeBtnPressed: {
        opacity: 0.9,
        transform: [{scale: 0.98}],
    },
});