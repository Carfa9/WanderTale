import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppText } from "@/components/appText";
import {InlineLabelInput} from "@/components/inlineLableInput";

const schema = z
    .object({
        title: z.string().trim().min(1, "Titel krävs"),
        startDate: z.string().trim().min(1, "Välj startdatum"),
        endDate: z.string().trim().min(1, "Välj slutdatum"),
        travelMode: z.string().trim().min(1, "Välj färdsätt"),
        description: z.string().trim().optional(),
    })
    .refine(
        (data) => data.endDate >= data.startDate,
        {
            message: "Slutdatum kan inte vara före startdatum",
            path: ["endDate"],
        }
    );

// OBS: ovan jämför strängar. Det funkar bra om du använder YYYY-MM-DD.
// Om du skriver 2026-01-10 osv blir ordningen korrekt.

type FormData = z.infer<typeof schema>;

export default function NewTripForm() {
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: "",
            startDate: "",
            endDate: "",
            travelMode: "",
            description: "",
        },
        mode: "onBlur",
    });

    const onSubmit = (data: FormData) => {
        console.log("SUBMIT", data);
    };

    return (
        <View style={styles.container}>
            <Controller
                control={control}
                name="title"
                render={({ field: { onChange, onBlur, value } }) => (
                    <InlineLabelInput
                        label="Titel"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        placeholder="T.ex. Slovenien 2026"
                    />
                )}
            />
            {!!errors.title?.message && <Text style={styles.error}>{errors.title.message}</Text>}
            
            <Controller
                control={control}
                name="startDate"
                render={({ field: { onChange, onBlur, value } }) => (
                    <InlineLabelInput
                        label="Startdatum"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        placeholder="YYYY-MM-DD"
                    />
                )}
            />
            {!!errors.startDate?.message && (
                <Text style={styles.error}>{errors.startDate.message}</Text>
            )}
            
            <Controller
                control={control}
                name="endDate"
                render={({ field: { onChange, onBlur, value } }) => (
                    <InlineLabelInput
                        label="Slutdatum"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        placeholder="YYYY-MM-DD"
                    />
                )}
            />
            {!!errors.endDate?.message && <Text style={styles.error}>{errors.endDate.message}</Text>}
            
            <Controller
                control={control}
                name="travelMode"
                render={({ field: { onChange, onBlur, value } }) => (
                    <InlineLabelInput
                        label={"Färdsätt"}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        placeholder="Bil, tåg, flyg..."
                    />
                )}
            />
            {!!errors.travelMode?.message && (
                <Text style={styles.error}>{errors.travelMode.message}</Text>
            )}
            
            <Controller
                control={control}
                name="description"
                render={({ field: { onChange, onBlur, value } }) => (
                    <InlineLabelInput
                        label={"Beskrivning"}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value ?? ""}
                        placeholder="Kort om resan..."
                        inputProps={{
                            multiline: true,
                            numberOfLines: 4,
                        }}
                    />
                )}
            />
            {!!errors.description?.message && (
                <Text style={styles.error}>{errors.description.message}</Text>
            )}

            <AppText onPress={handleSubmit(onSubmit)} style={styles.submit}>
                Skapa resa
            </AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 50, gap: 20 },
    label: { marginTop: 10 },
    input: {
        borderColor: "gray",
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    textarea: { minHeight: 90, textAlignVertical: "top" },
    error: { color: "red", marginTop: 4 },
    submit: { marginTop: 16, fontSize: 20 },
});