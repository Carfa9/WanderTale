import type {ReactNode} from "react";
import {useEffect, useState} from "react";
import {View, StyleSheet, Pressable, ImageBackground, ScrollView, Modal} from "react-native";
import {AppText} from "@/components/app-text";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {router, useLocalSearchParams} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {deleteTrip, getTripById, updateTrip} from "@/api/trips";
import {getStopsByTripId} from "@/api/stops";
import {SafeAreaView} from "react-native-safe-area-context";
import {FormatDate} from "@/components/format-date";
import {TravelModeKey} from "@/types/travelMode";
import {transportOptionList, transportOptionsByKey} from "@/components/transport-options";
import {Image} from "expo-image";
import TripSectionTabs from "@/components/trip-section-tabs";
import {useTheme} from "@/context/ThemeContext";
import {InlineLabelInput} from "@/components/inline-label-input";
import DateInput from "@/components/date-input";
import {InlineLabelSelect} from "@/components/inline-label-select";
import TravelModePickerModal from "@/components/travel-mode-picker-modal";
import {CreateTripDto} from "@/types/trip";

const FullScreenMessage = ({children}: { children: ReactNode }) => (
    <SafeAreaView
        style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
        }}
    >
        <AppText>{children}</AppText>
    </SafeAreaView>
);

export default function TripDetails() {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);
    const queryClient = useQueryClient();

    const {id} = useLocalSearchParams<{ id: string | string[] }>();
    const tripId = Array.isArray(id) ? id[0] : id;
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);
    const [descriptionClipped, setDescriptionClipped] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [modeOpen, setModeOpen] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editDestination, setEditDestination] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editStartDate, setEditStartDate] = useState<Date | null>(null);
    const [editEndDate, setEditEndDate] = useState<Date | null>(null);
    const [editTravelModes, setEditTravelModes] = useState<TravelModeKey[]>([]);

    const {data: trip, isLoading, error} = useQuery({
        queryKey: ["trip", tripId],
        queryFn: () => getTripById(String(tripId)),
        enabled: !!tripId,
    });

    const {data: stops = []} = useQuery({
        queryKey: ["stops", tripId],
        queryFn: () => getStopsByTripId(String(tripId)),
        enabled: !!tripId,
    });

    useEffect(() => {
        if (!trip || editOpen) return;

        setEditTitle(trip.title ?? "");
        setEditDestination(trip.destination ?? "");
        setEditDescription(trip.description ?? "");
        setEditStartDate(trip.startDate ? new Date(trip.startDate) : null);
        setEditEndDate(trip.endDate ? new Date(trip.endDate) : null);
        setEditTravelModes(trip.travelModes ?? []);
    }, [trip, editOpen]);

    const deleteMutation = useMutation({
        mutationFn: () => deleteTrip(String(tripId)),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["trips"]});
            queryClient.removeQueries({queryKey: ["trip", tripId]});
            setMenuOpen(false);
            router.replace("/");
        },
    });

    const updateMutation = useMutation({
        mutationFn: (dto: CreateTripDto) => updateTrip(String(tripId), dto),
        onSuccess: async (updatedTrip) => {
            queryClient.setQueryData(["trip", tripId], updatedTrip);
            await queryClient.invalidateQueries({queryKey: ["trips"]});
            setEditOpen(false);
        },
    });

    if (isLoading) return <FullScreenMessage>Laddar...</FullScreenMessage>;
    if (error) return <FullScreenMessage>Något gick fel.</FullScreenMessage>;
    if (!trip) return <FullScreenMessage>Hittar inte resan.</FullScreenMessage>;

    const hasDescription = !!trip.description?.trim();
    const descriptionText = hasDescription ? trip.description!.trim() : "Ingen beskrivning än";

    const placeholder = (value: string | null | undefined, fallback: string) =>
        value?.trim() ? value : fallback;

    const destinationTitle = placeholder(trip.destination, trip.title ?? "Namnlös resa");
    const isLongDestinationTitle = destinationTitle.length > 10;
    const dateRangeText = `${trip.startDate ? FormatDate(trip.startDate) : "Start ej valt"} – ${trip.endDate ? FormatDate(trip.endDate) : "Slut ej valt"}`;
    const travelModes = trip.travelModes ?? [];

    const openEdit = () => {
        setEditTitle(trip.title ?? "");
        setEditDestination(trip.destination ?? "");
        setEditDescription(trip.description ?? "");
        setEditStartDate(trip.startDate ? new Date(trip.startDate) : null);
        setEditEndDate(trip.endDate ? new Date(trip.endDate) : null);
        setEditTravelModes(trip.travelModes ?? []);
        setMenuOpen(false);
        setEditOpen(true);
    };

    const toggleEditMode = (key: TravelModeKey) => {
        setEditTravelModes((current) =>
            current.includes(key)
                ? current.filter((mode) => mode !== key)
                : [...current, key]
        );
    };

    const saveEdit = () => {
        const title = editTitle.trim();
        if (!title || updateMutation.isPending) return;

        updateMutation.mutate({
            title,
            destination: editDestination.trim() || null,
            startDate: editStartDate ? editStartDate.toISOString() : null,
            endDate: editEndDate ? editEndDate.toISOString() : null,
            description: editDescription.trim() || null,
            travelModes: editTravelModes,
        });
    };

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.top}>
                <View style={styles.titleWrapper}>
                    <AppText size={30}>
                        {trip.title ?? "Namnlös resa"}
                    </AppText>
                </View>
            </View>

            <View style={styles.bottom}>
                <TripSectionTabs tripId={tripId}/>
                <View style={styles.paperStack}>
                    <ImageBackground
                        source={require("@/assets/images/TheWorld.png")}
                        style={styles.paper}
                        imageStyle={styles.paperImg}
                    >
                        <ScrollView
                            style={styles.content}
                            showsVerticalScrollIndicator={false}
                            overScrollMode="never"
                            contentContainerStyle={styles.scrollContent}
                        >
                            <View style={styles.tripSummaryCard}>
                                <View pointerEvents="none" style={styles.cardAtmosphere}>                                   
                                </View>

                                <View style={styles.cardContent}>
                                    <View style={styles.cardHeader}>
                                        <AppText
                                            style={[
                                                styles.destinationTitle,
                                                isLongDestinationTitle && styles.destinationTitleLong,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {destinationTitle}
                                        </AppText>
                                        <Pressable
                                            onPress={() => setMenuOpen(true)}
                                            hitSlop={12}
                                            style={styles.tripMenuButton}
                                        >
                                            <Ionicons
                                                name="ellipsis-vertical"
                                                size={22}
                                                color={theme.tokens.accentSoft}
                                            />
                                        </Pressable>
                                    </View>

                                    <View style={styles.metaRow}>
                                        <Ionicons
                                            name="calendar-outline"
                                            size={15}
                                            color={theme.tokens.textSecondary}
                                        />
                                        <AppText style={styles.metaText}>{dateRangeText}</AppText>
                                    </View>

                                    <View style={styles.stopSummaryRow}>
                                        <AppText style={styles.stopSummaryText}>{stops.length} stopp</AppText>
                                        <AppText style={styles.stopSeparator}>•</AppText>
                                        <Pressable
                                            onPress={() => router.push(`/trip-details/${tripId}/stops`)}
                                            hitSlop={8}
                                        >
                                            <AppText style={styles.stopLink}>Visa</AppText>
                                        </Pressable>
                                    </View>

                                    <View style={styles.divider}/>

                                    <View style={styles.journalSection}>
                                        <AppText style={styles.sectionTitle}>Färdsätt</AppText>
                                        {travelModes.length ? (
                                            <View style={styles.transportChipRow}>
                                                {travelModes.map((key: TravelModeKey) => {
                                                    const option = transportOptionList.find((item) => item.key === key);

                                                    return (
                                                        <View key={key} style={styles.transportChip}>
                                                            <Image
                                                                source={transportOptionsByKey[key]}
                                                                style={styles.transportChipIcon}
                                                                contentFit="contain"
                                                                tintColor={theme.tokens.textPrimary}
                                                            />
                                                            <AppText style={styles.transportChipText}>
                                                                {option?.label ?? key}
                                                            </AppText>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        ) : (
                                            <AppText style={styles.placeholderValue}>Inget färdsätt valt</AppText>
                                        )}
                                    </View>

                                    <View style={styles.journalSection}>
                                        <AppText style={styles.sectionTitle}>Beskrivning</AppText>
                                        <Pressable
                                            disabled={!descriptionClipped}
                                            onPress={() => setDescriptionExpanded((current) => !current)}
                                            style={styles.descriptionBody}
                                        >
                                            <AppText
                                                style={[
                                                    styles.descriptionValue,
                                                    !hasDescription && styles.placeholderValue,
                                                ]}
                                                numberOfLines={descriptionExpanded ? undefined : 3}
                                                onTextLayout={(event) => {
                                                    const clipped = event.nativeEvent.lines.length > 3;
                                                    setDescriptionClipped((current) =>
                                                        current === clipped ? current : clipped
                                                    );
                                                }}
                                            >
                                                {descriptionText}
                                            </AppText>

                                            {descriptionClipped && (
                                                <Ionicons
                                                    name={descriptionExpanded ? "chevron-up" : "chevron-down"}
                                                    size={18}
                                                    color={theme.tokens.textSecondary}
                                                    style={styles.descriptionChevron}
                                                />
                                            )}
                                        </Pressable>
                                    </View>

                                    <View style={styles.cardActionRow}>
                                        <Pressable
                                            style={styles.cardActionButton}
                                            onPress={() => router.push(`/trip-details/${tripId}/new-entry`)}
                                        >
                                            <Ionicons
                                                name="create-outline"
                                                size={17}
                                                color={theme.tokens.textPrimary}
                                            />
                                            <AppText style={styles.cardActionText}>Anteckning</AppText>
                                        </Pressable>
                                        <Pressable
                                            style={[styles.cardActionButton, styles.cardActionButtonSecondary]}
                                            onPress={() => router.push(`/trip-details/${tripId}/new-photo`)}
                                        >
                                            <Ionicons
                                                name="camera-outline"
                                                size={17}
                                                color={theme.tokens.textPrimary}
                                            />
                                            <AppText style={styles.cardActionText}>Foto</AppText>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>

                            <Pressable
                                style={styles.addStopLink}
                                onPress={() => router.push(`/trip-details/${tripId}/new-stop`)}
                            >
                                <Ionicons name="add" size={18} color={theme.tokens.textPrimary}/>
                                <AppText style={styles.addStopText}>Lägg till stopp</AppText>
                            </Pressable>
                        </ScrollView>
                    </ImageBackground>
                </View>
            </View>

            <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)}>
                    <Pressable style={styles.menuSheet}>
                        <Pressable style={styles.menuAction} onPress={openEdit}>
                            <Ionicons name="create-outline" size={20} color={theme.tokens.textPrimary}/>
                            <AppText style={styles.menuActionText}>Redigera resa</AppText>
                        </Pressable>

                        <Pressable
                            style={styles.menuAction}
                            disabled={deleteMutation.isPending}
                            onPress={() => deleteMutation.mutate()}
                        >
                            <Ionicons name="trash-outline" size={20} color={theme.tokens.error}/>
                            <AppText style={[styles.menuActionText, styles.deleteText]}>
                                {deleteMutation.isPending ? "Tar bort..." : "Ta bort resa"}
                            </AppText>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.editSheet}>
                        <View style={styles.editHeader}>
                            <AppText size={24}>Redigera resa</AppText>
                            <Pressable onPress={() => setEditOpen(false)} hitSlop={12}>
                                <Ionicons name="close" size={22} color={theme.tokens.textPrimary}/>
                            </Pressable>
                        </View>

                        <ScrollView contentContainerStyle={styles.editContent} keyboardShouldPersistTaps="handled">
                            <InlineLabelInput label="Titel: " value={editTitle} onChangeText={setEditTitle}/>
                            <InlineLabelInput
                                label="Destination: "
                                value={editDestination}
                                onChangeText={setEditDestination}
                            />
                            <DateInput label="Start:" value={editStartDate} onChange={setEditStartDate}/>
                            <DateInput
                                label="Slut:"
                                value={editEndDate}
                                onChange={setEditEndDate}
                                minimumDate={editStartDate ?? undefined}
                            />
                            <InlineLabelSelect
                                label="Färdsätt:"
                                value={editTravelModes}
                                onPress={() => setModeOpen(true)}
                            />
                            <InlineLabelInput
                                label="Beskrivning: "
                                value={editDescription}
                                onChangeText={setEditDescription}
                                inputStyles={{minHeight: 90}}
                                inputProps={{multiline: true, numberOfLines: 4}}
                            />

                            <Pressable
                                style={[
                                    styles.saveButton,
                                    (!editTitle.trim() || updateMutation.isPending) && styles.saveButtonDisabled,
                                ]}
                                disabled={!editTitle.trim() || updateMutation.isPending}
                                onPress={saveEdit}
                            >
                                <AppText style={styles.saveButtonText}>
                                    {updateMutation.isPending ? "Sparar..." : "Spara ändringar"}
                                </AppText>
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <TravelModePickerModal
                visible={modeOpen}
                value={editTravelModes}
                onClose={() => setModeOpen(false)}
                onSelect={toggleEditMode}
                onDone={() => setModeOpen(false)}
            />
        </SafeAreaView>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: theme.background,
    },

    top: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 52,
        borderBottomWidth: 10,
        borderBottomColor: theme.border,
    },

    titleWrapper: {
        textAlign: "center",
        justifyContent: "center",
    },

    bottom: {
        flex: 7,
        alignItems: "center",
        paddingHorizontal: 18,
    },

    paperStack: {
        width: "100%",
        alignItems: "center",
        position: "relative",
        marginTop: 12,
        maxWidth: 390,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: theme.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.borderLight,
        shadowColor: theme.shadow,
        shadowOpacity: 0.1,
        shadowRadius: 14,
        shadowOffset: {width: 0, height: 6},
        elevation: 4,
    },

    paper: {
        width: "100%",
        alignItems: "center",
        minHeight: 520,
    },

    paperImg: {
        resizeMode: "cover",
        opacity: 0.26,
    },

    content: {
        width: "100%",
        maxWidth: 340,
        paddingHorizontal: 14,
        paddingVertical: 22,
        paddingBottom: 30,
    },

    scrollContent: {
        paddingBottom: 40,
        paddingTop: 6,
    },

    tripSummaryCard: {
        width: "100%",
        position: "relative",
        overflow: "hidden",
        paddingHorizontal: 18,
        paddingTop: 24,
        paddingBottom: 18,
        borderRadius: 12,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.borderLight,
        shadowColor: theme.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: {width: 0, height: 4},
        elevation: 2,
    },

    cardAtmosphere: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.45,
    },

    cardContent: {
        position: "relative",
        zIndex: 1,
    },
    
    cardHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },

    destinationTitle: {
        flex: 1,
        fontSize: 40,
        lineHeight: 56,
        color: theme.textPrimary,
        letterSpacing: 0,
    },

    destinationTitleLong: {
        fontSize: 34,
        lineHeight: 48,
    },

    tripMenuButton: {
        width: 32,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
    },

    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        marginTop: 4,
    },

    metaText: {
        fontFamily: "Nunito_600SemiBold",
        fontSize: 13,
        lineHeight: 18,
        color: theme.textSecondary,
    },

    stopSummaryRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        marginTop: 10,
    },

    stopSummaryText: {
        fontFamily: "Nunito_600SemiBold",
        fontSize: 14,
        color: theme.textPrimary,
    },

    stopSeparator: {
        fontFamily: "Nunito_600SemiBold",
        fontSize: 14,
        color: theme.textMuted,
    },

    stopLink: {
        fontFamily: "Nunito_700Bold",
        fontSize: 14,
        color: theme.accentSoft,
    },

    divider: {
        height: 1,
        marginTop: 16,
        marginBottom: 16,
        backgroundColor: theme.borderLight,
    },

    journalSection: {
        gap: 8,
        marginBottom: 16,
        marginTop: 10,
    },

    sectionTitle: {
        fontFamily: "Nunito_700Bold",
        fontSize: 13,
        lineHeight: 18,
        color: theme.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0,
    },

    transportChipRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },

    transportChip: {
        minHeight: 34,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: theme.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.borderLight,
    },

    transportChipIcon: {
        width: 18,
        height: 18,
    },

    transportChipText: {
        fontFamily: "Nunito_700Bold",
        fontSize: 14,
        color: theme.textPrimary,
    },

    descriptionBody: {
        position: "relative",
        paddingTop: 2,
        paddingRight: 22,
    },

    descriptionChevron: {
        position: "absolute",
        right: 0,
        bottom: 1,
    },

    descriptionValue: {
        fontSize: 18,
        lineHeight: 32,
        color: theme.textPrimary,
        textAlign: "left",
    },

    placeholderValue: {
        color: theme.textMuted,
    },

    cardActionRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 2,
    },

    cardActionButton: {
        flex: 1,
        minHeight: 40,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: theme.accentSoft,
        borderWidth: 1,
        borderColor: theme.borderLight,
    },

    cardActionButtonSecondary: {
        backgroundColor: theme.tape,
    },

    cardActionText: {
        fontFamily: "Nunito_700Bold",
        fontSize: 14,
        color: theme.textPrimary,
    },

    addStopLink: {
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginTop: 14,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },

    addStopText: {
        fontSize: 17,
        color: theme.textPrimary,
    },

    modalBackdrop: {
        flex: 1,
        backgroundColor: theme.shadow,
        justifyContent: "flex-end",
    },

    menuSheet: {
        margin: 18,
        padding: 12,
        borderRadius: 14,
        backgroundColor: theme.background,
        borderWidth: 1,
        borderColor: theme.borderLight,
        gap: 4,
    },

    menuAction: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
    },

    menuActionText: {
        fontSize: 18,
        color: theme.textPrimary,
    },

    deleteText: {
        color: theme.error,
    },

    editSheet: {
        maxHeight: "88%",
        backgroundColor: theme.background,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderWidth: 1,
        borderColor: theme.borderLight,
        overflow: "hidden",
    },

    editHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.borderLight,
    },

    editContent: {
        padding: 20,
        gap: 16,
    },

    saveButton: {
        minHeight: 50,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        backgroundColor: theme.accentSoft,
        borderWidth: 1,
        borderColor: theme.borderLight,
    },

    saveButtonDisabled: {
        opacity: 0.55,
    },

    saveButtonText: {
        fontSize: 18,
        color: theme.textPrimary,
    },
});
