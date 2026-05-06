import { router, useLocalSearchParams } from "expo-router";
import PickImage from "@/components/image-picker";
import {
    Alert,
    ImageBackground,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { AppText } from "@/components/app-text";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPhoto } from "@/api/photo";
import { getEntries } from "@/api/entries";
import DateInput from "@/components/date-input";
import { InlineLabelInput } from "@/components/inline-label-input";
import { convertToJpg } from "@/components/convert-to-jpg";
import { Entry } from "@/types/entry";
import { FormatDate } from "@/components/format-date";

export default function NewPhoto() {
    const { id, entryId: entryIdParam } = useLocalSearchParams<{ id: string; entryId?: string }>();
    const tripId = String(id);
    const queryClient = useQueryClient();

    const [selectedImageUris, setSelectedImageUris] = useState<string[]>([]);
    const [photoDate, setPhotoDate] = useState<Date | null>(null);
    const [location, setLocation] = useState("");
    const [entryId, setEntryId] = useState<string | null>(entryIdParam ?? null);
    const [entryPickerVisible, setEntryPickerVisible] = useState(false);

    const { data: entries = [] } = useQuery({
        queryKey: ["entries", tripId],
        queryFn: () => getEntries(tripId),
        enabled: !!tripId,
    });

    const selectedEntry = entries.find((e) => e.id === entryId) ?? null;

    const createPhotoMutation = useMutation({
        mutationFn: (formData: FormData) => createPhoto(tripId, formData),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["photos", tripId] });
        },
        onError: () => {
            Alert.alert("Fel", "Kunde inte spara bilden.");
        },
    });

    const handleSavePhoto = async () => {
        if (selectedImageUris.length === 0) {
            Alert.alert("Ingen bild vald", "Välj en bild först.");
            return;
        }

        try {
            for (const originalUri of selectedImageUris) {
                const jpgUri = await convertToJpg(originalUri);
                const formData = new FormData();
                if (location.trim()) formData.append("location", location.trim());
                if (photoDate) formData.append("photoDate", photoDate.toISOString());
                if (entryId) formData.append("entryId", entryId);
                formData.append("image", { uri: jpgUri, name: `photo-${Date.now()}.jpg`, type: "image/jpeg" } as any);
                await createPhotoMutation.mutateAsync(formData);
            }
            router.back();
        } catch {
            Alert.alert("Fel", "Kunde inte spara bilden.");
        }
    };

    const entryLabel = selectedEntry
        ? `${FormatDate(selectedEntry.entryDate ?? null) ?? ""} ${selectedEntry.title ?? ""}`.trim()
        : "Ingen";

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <ImageBackground source={require("@/assets/images/TheWorld.png")} style={{ flex: 1 }} resizeMode="cover">
                <View style={styles.headLine}>
                    <AppText size={30}>Foto</AppText>
                </View>

                <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="interactive"
                    >
                        <View style={styles.container}>
                            <View style={styles.fields}>
                                <DateInput label="När:" value={photoDate} onChange={setPhotoDate} />

                                <InlineLabelInput label="Var: " value={location} onChangeText={setLocation} />

                                <Pressable style={styles.entryPicker} onPress={() => setEntryPickerVisible(true)}>
                                    <AppText style={styles.entryPickerLabel}>Anteckning: </AppText>
                                    <AppText style={styles.entryPickerValue} numberOfLines={1}>
                                        {entryLabel}
                                    </AppText>
                                </Pressable>
                            </View>

                            <PickImage onImageSelected={setSelectedImageUris} />

                            <Pressable
                                style={styles.submitButton}
                                disabled={createPhotoMutation.isPending}
                                onPress={handleSavePhoto}
                            >
                                <AppText style={styles.submit}>
                                    {createPhotoMutation.isPending ? "Sparar..." : "Spara"}
                                </AppText>
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </ImageBackground>

            <Modal visible={entryPickerVisible} transparent animationType="slide">
                <Pressable style={styles.modalBackdrop} onPress={() => setEntryPickerVisible(false)}>
                    <View style={styles.modalSheet}>
                        <AppText size={22} style={styles.modalTitle}>Välj anteckning</AppText>

                        <Pressable
                            style={[styles.entryOption, !entryId && styles.entryOptionSelected]}
                            onPress={() => { setEntryId(null); setEntryPickerVisible(false); }}
                        >
                            <AppText>Ingen</AppText>
                        </Pressable>

                        {entries.map((entry: Entry) => (
                            <Pressable
                                key={entry.id}
                                style={[styles.entryOption, entryId === entry.id && styles.entryOptionSelected]}
                                onPress={() => { setEntryId(entry.id); setEntryPickerVisible(false); }}
                            >
                                <AppText style={styles.entryOptionDate}>{FormatDate(entry.entryDate ?? null) ?? ""}</AppText>
                                <AppText>{entry.title ?? "Namnlös"}</AppText>
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    headLine: { paddingTop: 50, alignItems: "center" },
    keyboard: { flex: 1 },
    container: { flex: 1, padding: 50, gap: 20 },
    fields: { gap: 20 },
    entryPicker: {
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.15)",
        paddingVertical: 8,
        gap: 4,
    },
    entryPickerLabel: { fontSize: 18 },
    entryPickerValue: { fontSize: 18, flex: 1, color: "rgba(0,0,0,0.6)" },
    error: { color: "red", marginTop: 4 },
    submit: { fontSize: 20, textAlignVertical: "center", alignSelf: "center" },
    submitButton: {
        alignSelf: "center",
        width: "100%",
        maxWidth: 350,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "#D5F7F4",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    modalSheet: {
        backgroundColor: "#F5EDE4",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        gap: 12,
        maxHeight: "60%",
    },
    modalTitle: { marginBottom: 8 },
    entryOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.5)",
        gap: 2,
    },
    entryOptionSelected: { backgroundColor: "#D5F7F4" },
    entryOptionDate: { fontSize: 13, color: "rgba(0,0,0,0.5)" },
});
