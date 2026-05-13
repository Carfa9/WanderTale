import {useState} from "react";
import {Pressable, ScrollView, StyleSheet, View} from "react-native";
import {router, useLocalSearchParams} from "expo-router";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {SafeAreaView} from "react-native-safe-area-context";
import {AppText} from "@/components/app-text";
import DateInput from "@/components/date-input";
import {InlineLabelInput} from "@/components/inline-label-input";
import TravelModePickerModal from "@/components/travel-mode-picker-modal";
import {InlineLabelSelect} from "@/components/inline-label-select";
import {createStop} from "@/api/stops";
import {useTheme} from "@/context/ThemeContext";
import {TravelModeKey} from "@/types/travelMode";
import {Stop} from "@/types/stop";

export default function NewStopScreen() {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);
    const {id} = useLocalSearchParams<{ id: string | string[] }>();
    const tripId = Array.isArray(id) ? id[0] : id;
    const queryClient = useQueryClient();

    const [title, setTitle] = useState("");
    const [country, setCountry] = useState("");
    const [description, setDescription] = useState("");
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [travelModes, setTravelModes] = useState<TravelModeKey[]>([]);
    const [modeOpen, setModeOpen] = useState(false);

    const mutation = useMutation({
        mutationFn: () => createStop(String(tripId), {
            title: title.trim(),
            country: country.trim() || null,
            description: description.trim() || null,
            startDate: startDate ? startDate.toISOString() : null,
            endDate: endDate ? endDate.toISOString() : null,
            travelModes,
        }),
        onSuccess: async (createdStop) => {
            queryClient.setQueryData<Stop[]>(["stops", tripId], (current = []) => {
                const withoutDuplicate = current.filter((stop) => stop.id !== createdStop.id);
                return [...withoutDuplicate, createdStop].sort((a, b) => a.orderIndex - b.orderIndex);
            });

            await queryClient.invalidateQueries({queryKey: ["stops", tripId]});
            router.back();
        },
    });

    const toggleMode = (key: TravelModeKey) => {
        setTravelModes((current) =>
            current.includes(key)
                ? current.filter((mode) => mode !== key)
                : [...current, key]
        );
    };

    const titleMissing = !title.trim();

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
            >
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} hitSlop={12}>
                        <AppText style={styles.backText}>Tillbaka</AppText>
                    </Pressable>
                    <AppText size={30}>Nytt stopp</AppText>
                </View>

                <InlineLabelInput
                    label="Stopp: "
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Florens"
                />

                <InlineLabelInput
                    label="Land: "
                    value={country}
                    onChangeText={setCountry}
                    placeholder="Italien"
                />

                <DateInput label="Start:" value={startDate} onChange={setStartDate}/>
                <DateInput label="Slut:" value={endDate} onChange={setEndDate} minimumDate={startDate ?? undefined}/>

                <InlineLabelSelect
                    label="Färdsätt:"
                    value={travelModes}
                    onPress={() => setModeOpen(true)}
                />

                <InlineLabelInput
                    label=""
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Anteckning om stoppet..."
                    inputStyles={{minHeight: 120}}
                    inputProps={{multiline: true, numberOfLines: 6}}
                />

                {!!mutation.error && (
                    <AppText style={styles.error}>Kunde inte spara stoppet.</AppText>
                )}

                <Pressable
                    style={[styles.button, titleMissing && styles.buttonDisabled]}
                    disabled={titleMissing || mutation.isPending}
                    onPress={() => mutation.mutate()}
                >
                    <AppText style={styles.buttonText}>
                        {mutation.isPending ? "Sparar..." : "Spara stopp"}
                    </AppText>
                </Pressable>
            </ScrollView>

            <TravelModePickerModal
                visible={modeOpen}
                value={travelModes}
                onClose={() => setModeOpen(false)}
                onSelect={toggleMode}
            />
        </SafeAreaView>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.background},
    content: {padding: 24, gap: 16},
    header: {gap: 12, marginBottom: 4},
    backText: {color: theme.textSecondary},
    error: {color: theme.error},
    button: {
        minHeight: 52,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: theme.accentSoft,
        borderWidth: 1,
        borderColor: theme.borderLight,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonDisabled: {opacity: 0.45},
    buttonText: {fontSize: 18, color: theme.textPrimary},
});
