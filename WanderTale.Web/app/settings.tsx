import {useTheme} from "@/context/ThemeContext";
import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {AppText} from "@/components/app-text";
import {ThemePicker} from "@/components/theme-picker";
import {ThemePreview} from "@/components/theme-preview";
import {DevThemeEditorContent} from "@/app/dev-theme-editor";
export default function Settings() {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);

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
})