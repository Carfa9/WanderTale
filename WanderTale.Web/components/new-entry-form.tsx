import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppText } from "@/components/app-text";
import { InlineLabelInput } from "@/components/inline-label-input";
import DateInput from "@/components/date-input";
import { CreateEntryDto } from "@/dto/createEntryDto";
import {useTheme} from "@/context/ThemeContext";

const schema = z.object({
    entryDate: z.string().nullable(),
    title: z.string().trim().optional(),
    content: z.string().trim().optional(),
});

type FormData = z.infer<typeof schema>;

type Props = {
    onSubmit: (dto: CreateEntryDto) => void;
    isSaving?: boolean;
    errorMessage?: string;
};

export default function NewEntryForm({ onSubmit, isSaving, errorMessage }: Props) {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);

    const form = useForm<FormData>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
            entryDate: null,
            title: "",
            content: "",
        },
        mode: "onBlur",
    });

    const {
        control,
        handleSubmit,
        clearErrors,
        formState: { errors },
        reset,
    } = form;

    const submit = (data: FormData) => {
        const dto: CreateEntryDto = {
            EntryDate: data.entryDate ?? null,
            Title: (data.title ?? "").trim(),
            Content: (data.content ?? "").trim(),
        };

        onSubmit(dto);
        reset();
    };

    return (
        <View style={styles.container}>
            <View style={styles.fields}>
                <Controller
                    control={control}
                    name="entryDate"
                    render={({ field: { onChange, value } }) => (
                        <DateInput
                            label="När:"
                            value={value ? new Date(value) : null}
                            onChange={(date) => {
                                if (!date) {
                                    onChange(null);
                                    return;
                                }
                                onChange(date.toISOString());
                                clearErrors("entryDate");
                            }}
                        />
                    )}
                />
                {!!errors.entryDate?.message && <Text style={styles.error}>{errors.entryDate.message}</Text>}

                <Controller
                    control={control}
                    name="title"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <InlineLabelInput label="Var: " onBlur={onBlur} onChangeText={onChange} value={value ?? ""} />
                    )}
                />
                {!!errors.title?.message && <Text style={styles.error}>{errors.title.message}</Text>}

                <Controller
                    control={control}
                    name="content"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <InlineLabelInput
                            label=""
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value ?? ""}
                            inputStyles={{ minHeight: 240 }}
                            inputProps={{ multiline: true, numberOfLines: 20 }}
                        />
                    )}
                />
                {!!errors.content?.message && <Text style={styles.error}>{errors.content.message}</Text>}
            </View>

            <View style={styles.footer}>
                {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

                <Pressable style={styles.submitButton} disabled={!!isSaving} onPress={handleSubmit(submit)}>
                    <AppText style={styles.submit}>{isSaving ? "Sparar..." : "Spara"}</AppText>
                </Pressable>
            </View>
        </View>
    );
}


const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    container: {
        flex: 1,        
        padding: 50,
        gap: 20,
    },
    fields: {
        gap: 20,
    },
    footer: {
        marginTop: "auto",
        paddingTop: 16,
    },

    label: {
        marginTop: 10
    },

    input: {
        borderColor: theme.surface,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    textarea: {
        minHeight: 90,
        textAlignVertical: "top"
    },

    error: {
        color: theme.error,
        marginTop: 4
    },

    submit: {
        fontSize: 20,
        textAlignVertical: "center",
        alignSelf: "center"
    },

    submitButton: {
        alignSelf: "center",
        width: "100%",
        maxWidth: 350,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: theme.accentSoft,
        borderWidth: 1,
        borderColor: theme.borderLight,
    },
});
