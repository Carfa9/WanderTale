import {router, useLocalSearchParams} from "expo-router";
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
import {AppText} from "@/components/app-text";
import {SafeAreaView} from "react-native-safe-area-context";
import React, {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {createPhoto} from "@/api/photo";
import {getEntries} from "@/api/entries";
import DateInput from "@/components/date-input";
import {InlineLabelInput} from "@/components/inline-label-input";
import {convertToJpg} from "@/components/convert-to-jpg";
import {Entry} from "@/types/entry";
import {FormatDate} from "@/components/format-date";
import {useTheme} from "@/context/ThemeContext";
import {Ionicons} from "@expo/vector-icons";

type ReactNativeFormDataFile = {
    uri: string;
    name: string;
    type: string;
};

export default function NewPhoto() {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);
    const {id, entryId: entryIdParam} = useLocalSearchParams<{ id: string; entryId?: string }>();
    const tripId = String(id);
    const queryClient = useQueryClient();

    const [selectedImageUris, setSelectedImageUris] = useState<string[]>([]);
    const [photoDate, setPhotoDate] = useState<Date | null>(null);
    const [location, setLocation] = useState("");
    const [entryId, setEntryId] = useState<string | null>(entryIdParam ?? null);
    const [entryPickerVisible, setEntryPickerVisible] = useState(false);

    const {data: entries = []} = useQuery({
        queryKey: ["entries", tripId],
        queryFn: () => getEntries(tripId),
        enabled: !!tripId,
    });

    const selectedEntry = entries.find((e) => e.id === entryId) ?? null;

    const createPhotoMutation = useMutation({
        mutationFn: (formData: FormData) => createPhoto(tripId, formData),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["photos", tripId]});
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
                const image: ReactNativeFormDataFile = {
                    uri: jpgUri,
                    name: `photo-${Date.now()}.jpg`,
                    type: "image/jpeg",
                };
                formData.append("image", image as unknown as Blob);
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
        <SafeAreaView style={styles.screen}>
            <ImageBackground
                source={require("@/assets/images/TheWorld.png")}
                style={styles.background}
                imageStyle={styles.backgroundImage}
                resizeMode="cover"
            >
                <View style={styles.headLine}>
                    <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
                        <Ionicons name="chevron-back" size={22} color={theme.tokens.textPrimary}/>
                    </Pressable>
                    <View style={styles.titleBlock}>
                        <AppText size={30} style={styles.title}>Nytt foto</AppText>
                        <AppText style={styles.subtitle}>Spara ett ögonblick från resan</AppText>
                    </View>
                </View>

                <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="interactive"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.container}>
                            <PickImage onImageSelected={setSelectedImageUris}/>

                            <View style={styles.fieldsCard}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="pricetag-outline" size={18} color={theme.tokens.textSecondary}/>
                                    <AppText style={styles.cardTitle}>Detaljer</AppText>
                                </View>

                                <DateInput label="När:" value={photoDate} onChange={setPhotoDate}/>

                                <InlineLabelInput label="Var: " value={location} onChangeText={setLocation}/>

                                <Pressable style={styles.entryPicker} onPress={() => setEntryPickerVisible(true)}>
                                    <AppText style={styles.entryPickerLabel}>Anteckning: </AppText>
                                    <AppText style={styles.entryPickerValue} numberOfLines={1}>
                                        {entryLabel}
                                    </AppText>
                                    <Ionicons name="chevron-down" size={17} color={theme.tokens.textSecondary}/>
                                </Pressable>
                            </View>

                            <Pressable
                                style={[
                                    styles.submitButton,
                                    (selectedImageUris.length === 0 || createPhotoMutation.isPending) &&
                                    styles.submitButtonDisabled,
                                ]}
                                disabled={selectedImageUris.length === 0 || createPhotoMutation.isPending}
                                onPress={handleSavePhoto}
                            >
                                <Ionicons name="checkmark" size={18} color={theme.tokens.textPrimary}/>
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
                            onPress={() => {
                                setEntryId(null);
                                setEntryPickerVisible(false);
                            }}
                        >
                            <AppText>Ingen</AppText>
                        </Pressable>

                        {entries.map((entry: Entry) => (
                            <Pressable
                                key={entry.id}
                                style={[styles.entryOption, entryId === entry.id && styles.entryOptionSelected]}
                                onPress={() => {
                                    setEntryId(entry.id);
                                    setEntryPickerVisible(false);
                                }}
                            >
                                <AppText style={styles.entryOptionDate}>
                                    {FormatDate(entry.entryDate ?? null) ?? ""}
                                </AppText>
                                <AppText>{entry.title ?? "Namnlös"}</AppText>
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.background},
    background: {flex: 1, backgroundColor: theme.surfaceAlt},
    backgroundImage: {opacity: theme.isDark ? 0.18 : 0.54},
    headLine: {
        minHeight: 98,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 16,
        paddingHorizontal: 56,
    },
    backButton: {
        position: "absolute",
        left: 18,
        bottom: 26,
        width: 38,
        height: 38,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 19,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.borderLight,
        shadowColor: theme.shadow,
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 3},
        elevation: 2,
    },
    titleBlock: {
        alignItems: "center",
    },
    title: {
        color: theme.textPrimary,
    },
    subtitle: {
        marginTop: -4,
        fontFamily: "Nunito_700Bold",
        fontSize: 13,
        lineHeight: 18,
        color: theme.textSecondary,
    },
    keyboard: {flex: 1},
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 28,
    },
    container: {
        width: "100%",
        maxWidth: 390,
        alignSelf: "center",
        gap: 16,
    },
    fieldsCard: {
        gap: 14,
        padding: 16,
        borderRadius: 14,
        backgroundColor: theme.isDark ? theme.surface : "rgba(255, 252, 244, 0.9)",
        borderWidth: 1,
        borderColor: theme.borderLight,
        shadowColor: theme.shadow,
        shadowOpacity: 0.09,
        shadowRadius: 12,
        shadowOffset: {width: 0, height: 5},
        elevation: 3,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingBottom: 2,
    },
    cardTitle: {
        fontFamily: "Nunito_700Bold",
        fontSize: 14,
        lineHeight: 18,
        color: theme.textSecondary,
        textTransform: "uppercase",
    },
    entryPicker: {
        minHeight: 46,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 4,
        backgroundColor: theme.surface,
        shadowColor: theme.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: {width: 0, height: 2},
        elevation: 2,
        gap: 4,
    },
    entryPickerLabel: {fontSize: 18},
    entryPickerValue: {
        fontSize: 18,
        flex: 1,
        color: theme.textSecondary,
    },
    submit: {
        fontSize: 20,
        textAlignVertical: "center",
        color: theme.textPrimary,
    },
    submitButton: {
        alignSelf: "center",
        minHeight: 46,
        minWidth: 152,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 999,
        backgroundColor: theme.accentSoft,
        borderWidth: 1,
        borderColor: theme.borderLight,
        shadowColor: theme.shadow,
        shadowOpacity: 0.09,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 3},
        elevation: 2,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: theme.shadow,
    },
    modalSheet: {
        backgroundColor: theme.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        gap: 12,
        maxHeight: "60%",
    },
    modalTitle: {marginBottom: 8},
    entryOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: theme.surface,
        gap: 2,
        borderWidth: 1,
        borderColor: theme.borderLight,
    },
    entryOptionSelected: {backgroundColor: theme.accentSoft},
    entryOptionDate: {fontSize: 13, color: theme.textMuted},
});
