import React from "react";
import {Keyboard, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View} from "react-native";
import {useTheme} from "@/context/ThemeContext";

type Props = {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    inputStyles?: StyleProp<TextStyle>;
    inputProps?: Omit<TextInputProps, "value" | "onChangeText" | "onBlur">;
};

export function InlineLabelInput({
    label,
    value,
    onChangeText,
    onBlur,
    placeholder,
    inputStyles,
    inputProps,
}: Props) {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);
    const isMultiline = !!inputProps?.multiline;
    const parentOnSubmit = inputProps?.onSubmitEditing;

    return (
        <View style={[styles.wrapper, isMultiline && styles.wrapperMultiline]}>
            <Text style={styles.inlineLabel}>{label}</Text>

            <TextInput
                style={[styles.input, isMultiline && styles.textarea, inputStyles]}
                value={value}
                onChangeText={onChangeText}
                onBlur={onBlur}
                placeholder={placeholder}
                placeholderTextColor={theme.tokens.textMuted}
                returnKeyType={isMultiline ? "default" : "done"}
                submitBehavior={isMultiline ? "newline" : "blurAndSubmit"}
                onSubmitEditing={(e) => {
                    parentOnSubmit?.(e);
                    if (!isMultiline) Keyboard.dismiss();
                }}
                {...inputProps}
            />
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    wrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.surface,
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 10,
        boxShadow: `0px 0px 10px ${theme.shadow}`,
    },
    wrapperMultiline: {
        alignItems: "flex-start",
    },
    inlineLabel: {
        marginRight: 10,
        fontSize: 18,
        paddingTop: 2,
        color: theme.textPrimary,
    },
    input: {
        flex: 1,
        fontFamily: "IndieFlower",
        fontSize: 18,
        paddingVertical: 0,
        color: theme.textPrimary,
    },
    textarea: {
        minHeight: 90,
        paddingVertical: 6,
        textAlignVertical: "top",
    },
});
