import React from "react";
import {View, Text, StyleSheet} from "react-native";
import {useForm, Controller, SubmitHandler} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {AppText} from "@/components/app-text";
import {InlineLabelInput} from "@/components/inlineLableInput";
import {InlineLabelSelect} from "@/components/inline-label-select";
import {transportOptions, TravelModeKey, travelModeKeys} from "@/data/transport-options";
import TravelModePickerModal from "@/components/travel-mode-picker-modal";

const onSubmit: SubmitHandler<FormData> = (data) => {
    console.log("SUBMIT", data);
};

const schema = z
    .object({
        title: z.string().trim().min(1, "Titel krävs"),
        startDate: z.string().trim().min(1, "Välj startdatum"),
        endDate: z.string().trim().min(1, "Välj slutdatum"),
        travelMode: z.enum(travelModeKeys).optional()
            .refine((v) => !!v, { message: "Välj färdsätt" }),
        description: z.string().trim().optional(),
    })
    .refine(
        (data) => data.endDate >= data.startDate,
        {
            message: "Slutdatum kan inte vara före startdatum",
            path: ["endDate"],
        }
    );

type FormData = z.infer<typeof schema>;

export default function NewTripForm() {
    
    const form = useForm<FormData>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
            title: "",
            startDate: "",
            endDate: "",
            travelMode: undefined,
            description: "",
        },
        mode: "onBlur",
    });

    const { control, handleSubmit, formState: { errors } } = form;

    const [modeOpen, setModeOpen] = React.useState(false);

    const onSubmit = (data: FormData) => {
        console.log("SUBMIT", data);
    };

    return (
        <View style={styles.container}>
            <Controller
                control={control}
                name="title"
                render={({field: {onChange, onBlur, value}}) => (
                    <InlineLabelInput
                        label="Titel: "
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                    />
                )}
            />
            {!!errors.title?.message && <Text style={styles.error}>{errors.title.message}</Text>}

            <Controller
                control={control}
                name="startDate"
                render={({field: {onChange, onBlur, value}}) => (
                    <InlineLabelInput
                        label="Startdatum:"
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
                render={({field: {onChange, onBlur, value}}) => (
                    <InlineLabelInput
                        label="Slutdatum:"
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
                render={({field: { onChange, onBlur, value } }) => {
                  
                    return (
                        <>
                            <InlineLabelSelect
                                label="Färdsätt:"
                                value={value}
                                onPress={() => setModeOpen(true)}
                            />

                            <TravelModePickerModal
                                visible={modeOpen}
                                value={value}
                                onClose={() => setModeOpen(false)}
                                onSelect={(key: TravelModeKey) => {
                                    onChange(key);
                                    setModeOpen(false);
                                }}
                            />
                        </>
                    );
                }}
            />
            {!!errors.travelMode?.message && (
                <Text style={styles.error}>{errors.travelMode.message}</Text>
            )}

            <Controller
                control={control}
                name="description"
                render={({field: {onChange, onBlur, value}}) => (
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
    container: {padding: 50, gap: 20},
    label: {marginTop: 10},
    input: {
        borderColor: "gray",
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    textarea: {minHeight: 90, textAlignVertical: "top"},
    error: {color: "red", marginTop: 4},
    submit: {marginTop: 16, fontSize: 20},
});