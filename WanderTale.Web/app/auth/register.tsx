import {useState} from "react";
import {
    ActivityIndicator,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import {router} from "expo-router";
import {SafeAreaView} from "react-native-safe-area-context";
import {Ionicons} from "@expo/vector-icons";
import {AppText} from "@/components/app-text";
import {useTheme} from "@/context/ThemeContext";
import {useAuth} from "@/context/AuthContext";
import {register} from "@/api/auth";
import {ApiError} from "@/api/http";

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const minPasswordLength = 8;

function authErrorMessage(error: unknown, fallback: string) {
    if (error instanceof ApiError) {
        try {
            const body = JSON.parse(error.body) as {message?: string};
            return body.message ?? fallback;
        } catch {
            return error.body || fallback;
        }
    }

    if (error instanceof TypeError) return "Ingen kontakt med servern. Kontrollera nätet och försök igen.";
    return fallback;
}

export default function RegisterScreen() {
    const {theme} = useTheme();
    const {signIn} = useAuth();
    const tokens = theme.tokens;
    const styles = createStyles(tokens);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function submit() {
        if (!name.trim() || !email.trim() || !password || !confirmPassword) {
            setError("Fyll i alla fält.");
            return;
        }

        if (!emailPattern.test(email.trim())) {
            setError("Skriv en giltig emailadress.");
            return;
        }

        if (password.length < minPasswordLength) {
            setError(`Lösenordet måste vara minst ${minPasswordLength} tecken.`);
            return;
        }

        if (password !== confirmPassword) {
            setError("Lösenorden matchar inte.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const session = await register(name.trim(), email.trim(), password);
            await signIn(session);
        } catch (submitError) {
            setError(authErrorMessage(submitError, "Kunde inte skapa konto. Försök igen."));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <ImageBackground source={require("@/assets/images/TheWorld.png")} resizeMode="cover" style={styles.background} imageStyle={styles.mapImage}>
            <SafeAreaView style={styles.screen}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
                        <View style={styles.paper}>
                            <View style={styles.tape}/>
                            <AppText style={styles.formTitle}>Skapa konto</AppText>
                            <AppText style={styles.subtitle}>Din resebok sparas på enheten och synkas när nätet finns.</AppText>

                            <AuthInput icon="person-outline" placeholder="Namn" value={name} onChangeText={setName} autoComplete="name"/>
                            <AuthInput icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email"/>
                            <AuthInput icon="lock-closed-outline" placeholder="Lösenord" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password"/>
                            <AuthInput icon="checkmark-circle-outline" placeholder="Bekräfta lösenord" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password"/>
                            {!!error && <AppText style={styles.error}>{error}</AppText>}

                            <Pressable onPress={() => void submit()} disabled={isSubmitting} style={({pressed}) => [styles.primaryButton, (pressed || isSubmitting) && styles.pressed]}>
                                {isSubmitting ? <ActivityIndicator color={tokens.background}/> : <AppText style={styles.primaryButtonText}>Skapa konto</AppText>}
                            </Pressable>

                            <Pressable onPress={() => router.replace("/auth/login")} style={({pressed}) => [styles.linkButton, pressed && styles.pressed]}>
                                <AppText style={styles.linkText}>Har du redan konto? Logga in</AppText>
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ImageBackground>
    );
}

type AuthInputProps = React.ComponentProps<typeof TextInput> & {
    icon: keyof typeof Ionicons.glyphMap;
};

function AuthInput({icon, style, ...props}: AuthInputProps) {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);

    return (
        <View style={styles.inputRow}>
            <Ionicons name={icon} size={20} color={theme.tokens.textSecondary}/>
            <TextInput {...props} placeholderTextColor={theme.tokens.textMuted} style={[styles.input, style]}/>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    background: {flex: 1, backgroundColor: theme.background},
    mapImage: {opacity: theme.isDark ? 0.16 : 0.38},
    screen: {flex: 1, backgroundColor: theme.isDark ? "rgba(18,25,42,0.68)" : "rgba(250,247,242,0.48)"},
    keyboard: {flex: 1},
    scrollContent: {flexGrow: 1, justifyContent: "center", paddingHorizontal: 22, paddingVertical: 28},
    paper: {
        width: "100%",
        maxWidth: 420,
        alignSelf: "center",
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 18,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.borderLight,
        backgroundColor: theme.surface,
        boxShadow: `0px 8px 18px ${theme.shadow}`,
    },
    tape: {
        position: "absolute",
        top: -12,
        alignSelf: "center",
        width: 92,
        height: 24,
        borderRadius: 3,
        backgroundColor: theme.tape,
        transform: [{rotate: "3deg"}],
    },
    formTitle: {textAlign: "center", fontSize: 30},
    subtitle: {marginTop: 4, marginBottom: 14, textAlign: "center", fontSize: 17, color: theme.textSecondary},
    inputRow: {
        minHeight: 48,
        marginBottom: 12,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: theme.borderLight,
        backgroundColor: theme.background,
    },
    input: {flex: 1, minWidth: 0, fontFamily: "IndieFlower", fontSize: 20, color: theme.textPrimary, paddingVertical: 8},
    error: {marginTop: 2, marginBottom: 10, fontSize: 16, color: theme.error, textAlign: "center"},
    primaryButton: {minHeight: 48, borderRadius: 4, alignItems: "center", justifyContent: "center", backgroundColor: theme.accentDark},
    primaryButtonText: {fontSize: 22, color: theme.background},
    linkButton: {paddingTop: 16, alignItems: "center"},
    linkText: {fontSize: 18, color: theme.textSecondary, textDecorationLine: "underline"},
    pressed: {opacity: 0.82},
});
