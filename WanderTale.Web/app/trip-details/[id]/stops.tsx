import {Modal, Pressable, ScrollView, StyleSheet, View} from "react-native";
import {Image} from "expo-image";
import {router, useLocalSearchParams} from "expo-router";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {SafeAreaView} from "react-native-safe-area-context";
import {AppText} from "@/components/app-text";
import {FormatDate} from "@/components/format-date";
import {transportOptionsByKey} from "@/components/transport-options";
import {useTheme} from "@/context/ThemeContext";
import {deleteStop, getStopsByTripId, updateStop} from "@/api/stops";
import {TravelModeKey} from "@/types/travelMode";
import {Ionicons} from "@expo/vector-icons";
import {Stop, CreateStopDto} from "@/types/stop";
import {InlineLabelInput} from "@/components/inline-label-input";
import DateInput from "@/components/date-input";
import {InlineLabelSelect} from "@/components/inline-label-select";
import TravelModePickerModal from "@/components/travel-mode-picker-modal";
import {useEffect, useState} from "react";

export default function StopsScreen() {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);
    const {id} = useLocalSearchParams<{ id: string | string[] }>();
    const tripId = Array.isArray(id) ? id[0] : id;
    const queryClient = useQueryClient();

    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [modeOpen, setModeOpen] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editCountry, setEditCountry] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editStartDate, setEditStartDate] = useState<Date | null>(null);
    const [editEndDate, setEditEndDate] = useState<Date | null>(null);
    const [editTravelModes, setEditTravelModes] = useState<TravelModeKey[]>([]);

    const {data: stops = [], isLoading, error} = useQuery({
        queryKey: ["stops", tripId],
        queryFn: () => getStopsByTripId(String(tripId)),
        enabled: !!tripId,
    });

    useEffect(() => {
        if (!selectedStop || editOpen) return;

        setEditTitle(selectedStop.title ?? "");
        setEditCountry(selectedStop.country ?? "");
        setEditDescription(selectedStop.description ?? "");
        setEditStartDate(selectedStop.startDate ? new Date(selectedStop.startDate) : null);
        setEditEndDate(selectedStop.endDate ? new Date(selectedStop.endDate) : null);
        setEditTravelModes(selectedStop.travelModes ?? []);
    }, [selectedStop, editOpen]);

    const updateMutation = useMutation({
        mutationFn: ({stopId, dto}: {stopId: string; dto: CreateStopDto}) => updateStop(stopId, dto),
        onSuccess: async (updatedStop) => {
            queryClient.setQueryData<Stop[]>(["stops", tripId], (current = []) =>
                current
                    .map((stop) => stop.id === updatedStop.id || stop.clientId === updatedStop.clientId ? updatedStop : stop)
                    .sort((a, b) => a.orderIndex - b.orderIndex)
            );
            await queryClient.invalidateQueries({queryKey: ["stops", tripId]});
            setEditOpen(false);
            setSelectedStop(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (stopId: string) => deleteStop(stopId),
        onSuccess: async (_, stopId) => {
            queryClient.setQueryData<Stop[]>(["stops", tripId], (current = []) =>
                current.filter((stop) => stop.id !== stopId && stop.clientId !== stopId)
            );
            await queryClient.invalidateQueries({queryKey: ["stops", tripId]});
            setMenuOpen(false);
            setSelectedStop(null);
        },
    });

    const openMenu = (stop: Stop) => {
        setSelectedStop(stop);
        setMenuOpen(true);
    };

    const openEdit = () => {
        if (!selectedStop) return;

        setEditTitle(selectedStop.title ?? "");
        setEditCountry(selectedStop.country ?? "");
        setEditDescription(selectedStop.description ?? "");
        setEditStartDate(selectedStop.startDate ? new Date(selectedStop.startDate) : null);
        setEditEndDate(selectedStop.endDate ? new Date(selectedStop.endDate) : null);
        setEditTravelModes(selectedStop.travelModes ?? []);
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
        if (!selectedStop || !editTitle.trim() || updateMutation.isPending) return;

        updateMutation.mutate({
            stopId: selectedStop.id,
            dto: {
                title: editTitle.trim(),
                country: editCountry.trim() || null,
                description: editDescription.trim() || null,
                startDate: editStartDate ? editStartDate.toISOString() : null,
                endDate: editEndDate ? editEndDate.toISOString() : null,
                travelModes: editTravelModes,
            },
        });
    };

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} hitSlop={12}>
                        <AppText style={styles.backText}>Tillbaka</AppText>
                    </Pressable>
                    <AppText size={30}>Stopp på resan</AppText>
                </View>

                {isLoading && <AppText style={styles.muted}>Laddar stopp...</AppText>}
                {!!error && <AppText style={styles.error}>Kunde inte hämta stopp.</AppText>}

                {!isLoading && !error && stops.length === 0 && (
                    <View style={styles.emptyBox}>
                        <AppText style={styles.muted}>
                            Lägg till platser du vill besöka under resan.
                        </AppText>
                    </View>
                )}

                {stops.map((stop) => (
                    <View key={stop.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                            <AppText size={22}>{stop.title}</AppText>
                            <View style={styles.cardHeaderActions}>
                                <AppText style={styles.order}>#{stop.orderIndex}</AppText>
                                <Pressable
                                    onPress={() => openMenu(stop)}
                                    hitSlop={12}
                                    style={styles.stopMenuButton}
                                >
                                    <Ionicons
                                        name="ellipsis-vertical"
                                        size={20}
                                        color={theme.tokens.textSecondary}
                                    />
                                </Pressable>
                            </View>
                        </View>

                        {!!stop.country && <AppText style={styles.muted}>{stop.country}</AppText>}

                        <AppText style={styles.dateText}>
                            {FormatDate(stop.startDate)}
                            {stop.endDate ? ` - ${FormatDate(stop.endDate)}` : ""}
                        </AppText>

                        {!!stop.description && (
                            <AppText style={styles.description}>{stop.description}</AppText>
                        )}

                        {stop.travelModes.length > 0 && (
                            <View style={styles.modeRow}>
                                {stop.travelModes.map((key: TravelModeKey) => (
                                    <Image
                                        key={key}
                                        source={transportOptionsByKey[key]}
                                        style={styles.modeIcon}
                                        contentFit="contain"
                                        tintColor={theme.tokens.textPrimary}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                ))}
            </ScrollView>

            <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)}>
                    <Pressable style={styles.menuSheet}>
                        <Pressable style={styles.menuAction} onPress={openEdit}>
                            <Ionicons name="create-outline" size={20} color={theme.tokens.textPrimary}/>
                            <AppText style={styles.menuActionText}>Redigera stopp</AppText>
                        </Pressable>

                        <Pressable
                            style={styles.menuAction}
                            disabled={deleteMutation.isPending || !selectedStop}
                            onPress={() => {
                                if (selectedStop) deleteMutation.mutate(selectedStop.id);
                            }}
                        >
                            <Ionicons name="trash-outline" size={20} color={theme.tokens.error}/>
                            <AppText style={[styles.menuActionText, styles.deleteText]}>
                                {deleteMutation.isPending ? "Tar bort..." : "Ta bort stopp"}
                            </AppText>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.editSheet}>
                        <View style={styles.editHeader}>
                            <AppText size={24}>Redigera stopp</AppText>
                            <Pressable onPress={() => setEditOpen(false)} hitSlop={12}>
                                <Ionicons name="close" size={22} color={theme.tokens.textPrimary}/>
                            </Pressable>
                        </View>

                        <ScrollView contentContainerStyle={styles.editContent} keyboardShouldPersistTaps="handled">
                            <InlineLabelInput label="Stopp: " value={editTitle} onChangeText={setEditTitle}/>
                            <InlineLabelInput label="Land: " value={editCountry} onChangeText={setEditCountry}/>
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

                            {!!updateMutation.error && (
                                <AppText style={styles.error}>Kunde inte spara stoppet.</AppText>
                            )}

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
    screen: {flex: 1, backgroundColor: theme.background},
    content: {padding: 24, gap: 14},
    header: {gap: 12, marginBottom: 4},
    backText: {color: theme.textSecondary},
    muted: {color: theme.textSecondary},
    error: {color: theme.error},
    emptyBox: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.borderLight,
    },
    card: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.borderLight,
        gap: 6,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    cardHeaderActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    stopMenuButton: {
        width: 30,
        height: 30,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
    },
    order: {color: theme.textMuted},
    dateText: {color: theme.textMuted},
    description: {color: theme.textSecondary, lineHeight: 22},
    modeRow: {flexDirection: "row", gap: 8, marginTop: 4},
    modeIcon: {width: 24, height: 24},
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
