import React from "react";
import {View, TextInput, StyleSheet, TextInputProps, Keyboard} from "react-native";
import { AppText } from "@/components/app-text";

type Props = {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    inputProps?: Omit<TextInputProps, "value" | "onChangeText" | "onBlur">;
};

export function InlineLabelInput({
                                     label,
                                     value,
                                     onChangeText,
                                     onBlur,
                                     placeholder,
                                     inputProps,
                                 }: Props) {
    const isMultiline = !!inputProps?.multiline;

    const parentOnSubmit = inputProps?.onSubmitEditing;
    
    return (
        <View style={[styles.wrapper, isMultiline && styles.wrapperMultiline]}>
            <AppText style={styles.inlineLabel}>{label}</AppText>

            <TextInput
                style={[styles.input, isMultiline && styles.textarea]}
                value={value}
                onChangeText={onChangeText}
                onBlur={onBlur}
                placeholder={placeholder}
                placeholderTextColor="#9aa0a6"
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

const styles = StyleSheet.create({
    wrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#d9d9d9",
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    wrapperMultiline: {
        alignItems: "flex-start",
    },
    inlineLabel: {
        marginRight: 10,
        fontSize: 18,
        paddingTop: 2,
    },
    input: {
        flex: 1,
        fontSize: 18,
        paddingVertical: 0,
    },
    textarea: {
        minHeight: 90,
        paddingVertical: 6,
        textAlignVertical: "top",
    },
});