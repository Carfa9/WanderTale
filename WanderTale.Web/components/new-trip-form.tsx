import React from "react";
import {View, Text, StyleSheet, Pressable} from "react-native";
import {useForm, Controller} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {AppText} from "@/components/app-text";
import {InlineLabelInput} from "@/components/inline-label-input";
import {InlineLabelSelect} from "@/components/inline-label-select";
import TravelModePickerModal from "@/components/travel-mode-picker-modal";
import DateInput from "@/components/date-input";
import {TravelModeKey, travelModeKeys} from "@/types/travelMode";
import {createTrip} from "@/api/trips";
import {CreateTripDto} from "@/types/trip";
import {transportOptionList} from "@/components/transport-options";
import {useTheme} from "@/context/ThemeContext";

const schema = z
    .object({
        title: z.string().trim().min(1, "Titel krävs"),
        destination: z.string().trim().optional(),
        startDate: z.string().nullable(),
        endDate: z.string().nullable(),
        travelModes: z.array(z.enum(travelModeKeys)).min(1, "Välj minst ett färdsätt"),
        description: z.string().trim().optional(),
    })
    .refine(
        (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
        {
            message: "Slutdatum kan inte vara före startdatum",
            path: ["endDate"],
        }
    )
    .refine(
    (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
    {
        message: "Startdatum kan inte vara efter slutdatum",
        path: ["startDate"],
    }
);

type FormData = z.infer<typeof schema>;

export default function NewTripForm() {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);

    
    const form = useForm<FormData>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
            title: "",
            destination: "",
            startDate: null,
            endDate: null,
            travelModes: [],
            description: "",
        },
        mode: "onBlur",
    });

    const {
        control,
        handleSubmit,
        getValues,
        setValue,
        setError,
        clearErrors,
        formState: { errors },
    } = form;

    const [modeOpen, setModeOpen] = React.useState(false);


    const onSubmit = async (data: FormData) => {
        try {
            console.log("SUBMIT", data);
            const dto: CreateTripDto = {
                ...data,
                destination: data.destination ?? null,
                description: data.description ?? null,
            };
            const created = await createTrip(dto);
            console.log("CREATED", created);
            form.reset();
        } catch (e) {
            console.log("CREATE TRIP ERROR", e);
        }        
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
                name="destination"
                render={({field: {onChange, onBlur, value}}) => (
                    <InlineLabelInput
                        label="Destination: "
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value ?? ""}
                    />
                )}
            />
            {!!errors.title?.message && <Text style={styles.error}>{errors.title.message}</Text>}

            <Controller
                control={control}
                name="startDate"
                render={({ field: { onChange, value } }) => (
                    <DateInput
                        label="Startdatum:"
                        value={value ? new Date(value) : null}
                        onChange={(date) => {
                            const iso = date.toISOString();
                            const end = getValues("endDate"); 

                            if (end && iso > end) {
                                setValue("startDate", end, { shouldDirty: true, shouldTouch: true });
                                setError("startDate", {
                                    type: "manual",
                                    message: "Startdatum kan inte vara efter slutdatum",
                                });
                                return;
                            }
                            
                            onChange(iso);
                            clearErrors("startDate");
                        }}
                    />
                )}
            />
            {!!errors.startDate?.message && (
                <Text style={styles.error}>{errors.startDate.message}</Text>
            )}

            <Controller
                control={control}
                name="endDate"
                render={({ field: { onChange, value } }) => (
                    <DateInput
                        label="Slutdatum:"
                        value={value ? new Date(value) : null}
                        onChange={(date) => {
                            const iso = date.toISOString();
                            const start = getValues("startDate");

                            if (start && iso < start) {
                             
                                setValue("endDate", start, { shouldDirty: true, shouldTouch: true });
                                setError("endDate", {
                                    type: "manual",
                                    message: "Slutdatum kan inte vara före startdatum",
                                });
                                return;
                            }
                            
                            onChange(iso);
                            clearErrors("endDate");
                        }}
                    />
                )}
            />
            {!!errors.endDate?.message && <Text style={styles.error}>{errors.endDate.message}</Text>}

            <Controller
                control={control}
                name="travelModes"
                render={({field: { onChange, value } }) => {
                  const selected = value ?? [];
                  
                  const selectedLabels = selected.map((key) => transportOptionList.find((o) => o.key === key)?.label ?? key);
                    return (
                        <>
                            <InlineLabelSelect
                                label="Färdsätt:"
                                value={selected}
                                onPress={() => setModeOpen(true)}
                            />

                            <TravelModePickerModal
                                visible={modeOpen}
                                value={selected}
                                onClose={() => setModeOpen(false)}
                                onSelect={(key: TravelModeKey) => {
                                    const next = selected.includes(key)
                                        ? selected.filter((k) => k !== key)
                                        : [...selected, key];
                                    onChange(next);
                                }}
                                onDone={() => setModeOpen(false)}
                            />
                        </>
                    );
                }}
            />
            {!!errors.travelModes?.message && (
                <Text style={styles.error}>{errors.travelModes.message}</Text>
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
            <Pressable style={styles.submitButton} onPress={handleSubmit((data) => {
                onSubmit(data);
                form.reset();
            })}>
            <AppText style={styles.submit}>
                Skapa resa
            </AppText>
            </Pressable>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    container: {
        padding: 50, 
        gap: 20
    },
    
    label: {
        marginTop: 10
    },
    
    input: {
        borderColor: "gray",
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
        borderColor: theme.borderLight,},
});
