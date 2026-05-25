import {useTheme} from "@/context/ThemeContext";
import {Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {AppText} from "@/components/app-text";
import {ThemePicker} from "@/components/theme-picker";
import {ThemePreview} from "@/components/theme-preview";
import {DevThemeEditorContent} from "@/app/dev-theme-editor";
import {useAuth} from "@/context/AuthContext";
import {getPendingLocalChangeCount} from "@/local/account";

export default function Settings() {
    const {theme} = useTheme();
    const {session, signOut} = useAuth();
    const styles = createStyles(theme.tokens);

    const confirmSignOut = async () => {
        const pendingCount = await getPendingLocalChangeCount();
        const pendingText = pendingCount > 0
            ? `Du har ${pendingCount} osynkade ${pendingCount === 1 ? "ändring" : "ändringar"}. `
            : "";

        Alert.alert(
            "Logga ut?",
            `${pendingText}När du loggar ut tas lokal cache för det här kontot bort från den här enheten. Osynkade ändringar försvinner.`,
            [
                {text: "Avbryt", style: "cancel"},
                {
                    text: "Logga ut",
                    style: "destructive",
                    onPress: () => void signOut(),
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.screen}>
            <KeyboardAvoidingView
                style={styles.keyboard}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={0}>
                <View style={styles.top}>
                    <AppText size={30}>Inställningar</AppText>
                </View>
                <ScrollView
                    contentContainerStyle={{paddingBottom: 32}}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive">

                    <View style={styles.bottom}>
                        <View style={styles.accountSection}>
                            <AppText style={styles.accountTitle}>Konto</AppText>
                            <AppText style={styles.accountText}>{session?.name}</AppText>
                            <AppText style={styles.accountSubText}>{session?.email}</AppText>
                            <Pressable
                                onPress={() => void confirmSignOut()}
                                style={({pressed}) => [styles.logoutButton, pressed && styles.pressed]}
                            >
                                <AppText style={styles.logoutText}>Logga ut</AppText>
                            </Pressable>
                        </View>
                        <ThemePicker/>
                        <ThemePreview tokens={theme.tokens}/>
                        {__DEV__ && <DevThemeEditorContent/>}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    keyboard: {flex: 1},
    screen: {flex: 1, backgroundColor: theme.background},

    top: {
        flex: 3, alignItems: "center",
        justifyContent: "center"
    },
    bottom: {
        flex: 4
    },
    accountSection: {
        marginHorizontal: 18,
        marginBottom: 18,
        padding: 14,
        backgroundColor: theme.surface,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.borderLight,
        boxShadow: `0px 3px 10px ${theme.shadow}`,
    },
    accountTitle: {
        fontSize: 24,
        marginBottom: 4,
    },
    accountText: {
        fontSize: 20,
    },
    accountSubText: {
        fontSize: 16,
        color: theme.textSecondary,
        marginBottom: 12,
    },
    logoutButton: {
        alignSelf: "flex-start",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
        backgroundColor: theme.accentDark,
    },
    logoutText: {
        color: theme.background,
        fontSize: 18,
    },
    pressed: {
        opacity: 0.85,
    },
})
