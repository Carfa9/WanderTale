import {View, StyleSheet} from "react-native";
import {AppText} from "@/components/app-text";
import React from "react";

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


const styles = StyleSheet.create({
    fieldCard: {
        width: "100%",
        maxWidth: 250,
        alignSelf: "center",
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "rgba(213, 247, 244, 0.85)",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
        marginBottom: 12,

        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },

    headerRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    fieldLabel: {
        fontSize: 20,
        paddingRight: 8,
    },

    fieldValue: {
        textAlign: "right",
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
        marginTop: 8,
        width: "100%",
    },

    stackText: {
        textAlign: "left",
    },
})