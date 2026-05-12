import React from "react";
import {StyleSheet, View} from "react-native";
import {AppText} from "@/components/app-text";
import {useTheme} from "@/context/ThemeContext";

type Props = {
    label: string;
    value?: string | null;
    placeholder?: string;
    children?: React.ReactNode;
    multiline?: boolean;
    stackedValue?: boolean;
};

export default function FieldCard({
    label,
    value,
    placeholder = "Under planering",
    children,
    multiline = false,
    stackedValue = false,
}: Props) {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);
    const text = value?.trim() ? value : placeholder;

    return (
        <View style={[styles.fieldCard, multiline && styles.fieldCardMultiline]}>
            <View style={styles.headerRow}>
                <AppText style={styles.fieldLabel}>{label}</AppText>
                {!stackedValue && (
                    <View style={styles.right}>
                        {children ? children : <AppText style={styles.fieldValue}>{text}</AppText>}
                    </View>
                )}
            </View>
            {stackedValue && (
                <View style={styles.stackBody}>
                    {children ? children : <AppText style={styles.stackText}>{text}</AppText>}
                </View>
            )}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    fieldCard: {
        width: "100%",
        maxWidth: 330,
        alignSelf: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.borderLight,
        marginBottom: 10,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    fieldLabel: {
        fontFamily: "Nunito_600SemiBold",
        fontSize: 15,
        color: theme.textSecondary,
    },
    fieldValue: {
        textAlign: "right",
        fontSize: 17,
        color: theme.textPrimary,
    },
    right: {
        flex: 1,
        alignItems: "flex-end",
    },
    fieldCardMultiline: {
        alignItems: "flex-start",
    },
    rightMultiline: {
        justifyContent: "flex-start",
        alignItems: "stretch",
    },
    stackBody: {
        marginTop: 6,
        width: "100%",
    },
    stackText: {
        textAlign: "left",
        color: theme.textPrimary,
    },
});
