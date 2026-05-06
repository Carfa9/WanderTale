import React, { useEffect, useState } from "react";
import {
    Alert,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { AppText } from "@/components/app-text";
import { getTripById } from "@/api/trips";
import { deletePhoto, getPhotos, updatePhotoCaption } from "@/api/photo";
import { Photo } from "@/types/photo";
import { api_url } from "@/api/config";
import { FormatDate } from "@/components/format-date";

const { width: screenWidth } = Dimensions.get("window");

const NUM_COLS = 3;
const GRID_PAD = 12;
const CELL_GAP = 8;
const CELL_SIZE = (screenWidth - GRID_PAD * 2 - CELL_GAP * (NUM_COLS - 1)) / NUM_COLS;
const THUMB_PAD = 4;
const THUMB_BOTTOM = 24;
const CELL_HEIGHT = CELL_SIZE + THUMB_PAD + THUMB_BOTTOM;


export default function AlbumScreen() {
    const { id, initialIndex } = useLocalSearchParams<{ id: string; initialIndex?: string }>();
    const tripId = String(id);
    const queryClient = useQueryClient();

    const [enlargedIndex, setEnlargedIndex] = useState<number | null>(null);
    const [overlayIndex, setOverlayIndex] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [captions, setCaptions] = useState<Record<string, string>>({});

    const { data: trip } = useQuery({
        queryKey: ["trip", tripId],
        queryFn: () => getTripById(tripId),
        enabled: !!tripId,
    });

    const { data: photos = [] } = useQuery({
        queryKey: ["photos", tripId],
        queryFn: () => getPhotos(tripId),
        enabled: !!tripId,
    });

    useEffect(() => {
        const parsed = parseInt(initialIndex ?? "", 10);
        if (Number.isFinite(parsed) && photos.length > 0) {
            const clamped = Math.min(parsed, photos.length - 1);
            setEnlargedIndex(clamped);
            setOverlayIndex(clamped);
        }
    }, [initialIndex, photos.length]);

    const currentPhoto = photos[overlayIndex] ?? null;

    const openOverlay = (index: number) => {
        setOverlayIndex(index);
        setEnlargedIndex(index);
    };

    const saveCaption = async (photo: Photo) => {
        const local = captions[photo.id];
        if (local === undefined || local === (photo.caption ?? "")) return;

        try {
            const nextCaption = local.trim() ? local.trim() : null;
            await captionMutation.mutateAsync({
                photoId: photo.id,
                caption: nextCaption,
            });
            setCaptions((prev) => ({ ...prev, [photo.id]: nextCaption ?? "" }));
        } catch {
            Alert.alert("Fel", "Kunde inte spara bildtexten.");
        }
    };

    const closeOverlay = async () => {
        if (currentPhoto) {
            await saveCaption(currentPhoto);
        }
        setEnlargedIndex(null);
    };

    const goToPhoto = async (index: number) => {
        if (currentPhoto) {
            await saveCaption(currentPhoto);
        }
        setOverlayIndex(index);
    };

    const toggleSelect = (photoId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(photoId)) {
                next.delete(photoId);
            } else {
                next.add(photoId);
            }
            return next;
        });
    };

    const deleteMutation = useMutation({
        mutationFn: (photoId: string) => deletePhoto(photoId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["photos", tripId] });
        },
        onError: () => Alert.alert("Fel", "Kunde inte ta bort bilden."),
    });

    const captionMutation = useMutation({
        mutationFn: ({ photoId, caption }: { photoId: string; caption: string | null }) =>
            updatePhotoCaption(photoId, caption),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["photos", tripId] }),
    });

    const handleDeleteSingle = (photo: Photo) => {
        Alert.alert("Ta bort bild", "Vill du ta bort den här bilden?", [
            { text: "Avbryt", style: "cancel" },
            {
                text: "Ta bort",
                style: "destructive",
                onPress: async () => {
                    closeOverlay();
                    await deleteMutation.mutateAsync(photo.id);
                },
            },
        ]);
    };

    const handleDeleteSelected = () => {
        const count = selectedIds.size;
        Alert.alert(
            "Ta bort bilder",
            `Vill du ta bort ${count} ${count === 1 ? "bild" : "bilder"}?`,
            [
                { text: "Avbryt", style: "cancel" },
                {
                    text: "Ta bort",
                    style: "destructive",
                    onPress: async () => {
                        await Promise.all([...selectedIds].map((id) => deletePhoto(id)));
                        await queryClient.invalidateQueries({ queryKey: ["photos", tripId] });
                        setSelectedIds(new Set());
                    },
                },
            ]
        );
    };

    const handleCaptionBlur = (photo: Photo) => {
        void saveCaption(photo);
    };

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <AppText style={styles.backText}>‹ Tillbaka</AppText>
                </Pressable>
                <AppText size={20} numberOfLines={1} style={styles.title}>
                    {trip?.title ?? ""}
                </AppText>
            </View>

            <FlatList<Photo | { id: "__add__" }>
                data={[...photos, { id: "__add__" }]}
                numColumns={NUM_COLS}
                keyExtractor={(item) => item.id}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={styles.gridContent}
                renderItem={({ item, index }) => {
                    if (item.id === "__add__") {
                        return (
                            <Pressable
                                style={styles.cell}
                                onPress={() => router.push(`/trip-details/${tripId}/new-photo`)}
                            >
                                <View style={[styles.thumbPolaroid, styles.addCell]}>
                                    <AppText style={styles.addPlus}>+</AppText>
                                    <AppText style={styles.addLabel}>Lägg till foto</AppText>
                                </View>
                            </Pressable>
                        );
                    }
                    const photo = item as Photo;
                    const isSelected = selectedIds.has(photo.id);
                    return (
                        <Pressable style={styles.cell} onPress={() => openOverlay(index)}>
                            <View style={styles.thumbPolaroid}>
                                <Image
                                    source={`${api_url}${photo.imageUri}`}
                                    style={styles.thumbPhoto}
                                    contentFit="cover"
                                />
                            </View>
                            <Pressable
                                style={styles.checkboxHitArea}
                                hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                                onPress={() => toggleSelect(photo.id)}
                            >
                                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                    {isSelected && <AppText style={styles.checkmark}>✓</AppText>}
                                </View>
                            </Pressable>
                        </Pressable>
                    );
                }}
            />

            {selectedIds.size > 0 && enlargedIndex === null && (
                <View style={styles.stickyBar}>
                    <Pressable style={styles.deleteAllBtn} onPress={handleDeleteSelected}>
                        <AppText style={styles.deleteAllText}>
                            Ta bort {selectedIds.size} {selectedIds.size === 1 ? "bild" : "bilder"}
                        </AppText>
                    </Pressable>
                </View>
            )}

            <Modal
                visible={enlargedIndex !== null}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={closeOverlay}
            >
                <Pressable style={styles.backdrop} onPress={closeOverlay} />

                <View style={styles.overlayContainer} pointerEvents="box-none">
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        style={styles.overlayKAV}
                        pointerEvents="box-none"
                    >
                        <View style={styles.innerCard}>
                            <Pressable style={styles.closeBtn} onPress={closeOverlay}>
                                <AppText style={styles.closeBtnText}>✕</AppText>
                            </Pressable>

                            {currentPhoto && (
                                <>
                                    <View style={styles.overlayPolaroid}>
                                        <Image
                                            source={`${api_url}${currentPhoto.imageUri}`}
                                            style={styles.overlayPhoto}
                                            contentFit="cover"
                                        />
                                    </View>

                                    {(currentPhoto.photoDate || currentPhoto.location) && (
                                        <View style={styles.metaBox}>
                                            {currentPhoto.photoDate && (
                                                <View style={styles.metaRow}>
                                                    <AppText style={styles.metaLabel}>Datum:</AppText>
                                                    <AppText style={styles.metaValue}>{FormatDate(currentPhoto.photoDate)}</AppText>
                                                </View>
                                            )}
                                            {currentPhoto.location && (
                                                <View style={styles.metaRow}>
                                                    <AppText style={styles.metaLabel}>Plats:</AppText>
                                                    <AppText style={styles.metaValue}>{currentPhoto.location}</AppText>
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    <TextInput
                                        style={styles.captionInput}
                                        placeholder="Skriv en bildtext..."
                                        placeholderTextColor="rgba(0,0,0,0.35)"
                                        value={captions[currentPhoto.id] ?? currentPhoto.caption ?? ""}
                                        onChangeText={(text) =>
                                            setCaptions((prev) => ({ ...prev, [currentPhoto.id]: text }))
                                        }
                                        onEndEditing={() => handleCaptionBlur(currentPhoto)}
                                        multiline
                                    />

                                    <Pressable
                                        style={[styles.saveCaptionBtn, captionMutation.isPending && styles.saveCaptionBtnDisabled]}
                                        disabled={captionMutation.isPending}
                                        onPress={() => saveCaption(currentPhoto)}
                                    >
                                        <AppText style={styles.saveCaptionText}>
                                            {captionMutation.isPending ? "Sparar..." : "Spara bildtext"}
                                        </AppText>
                                    </Pressable>

                                    <View style={styles.navRow}>
                                        <Pressable
                                            onPress={() => goToPhoto(Math.max(0, overlayIndex - 1))}
                                            disabled={overlayIndex === 0}
                                            style={styles.navArrow}
                                        >
                                            <AppText style={[styles.navArrowText, overlayIndex === 0 && styles.navArrowDisabled]}>
                                                ‹
                                            </AppText>
                                        </Pressable>

                                        <AppText style={styles.counter}>
                                            {overlayIndex + 1} / {photos.length}
                                        </AppText>

                                        <Pressable
                                            onPress={() => goToPhoto(Math.min(photos.length - 1, overlayIndex + 1))}
                                            disabled={overlayIndex === photos.length - 1}
                                            style={styles.navArrow}
                                        >
                                            <AppText style={[styles.navArrowText, overlayIndex === photos.length - 1 && styles.navArrowDisabled]}>
                                                ›
                                            </AppText>
                                        </Pressable>
                                    </View>

                                    <Pressable
                                        style={styles.deleteBtn}
                                        onPress={() => handleDeleteSingle(currentPhoto)}
                                    >
                                        <AppText style={styles.deleteBtnText}>Ta bort bild</AppText>
                                    </Pressable>
                                </>
                            )}
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F5EDE4" },

    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.1)",
    },
    backButton: { marginRight: 12 },
    backText: { fontSize: 18 },
    title: { flex: 1, textAlign: "center" },

    gridContent: {
        paddingTop: 12,
        paddingBottom: 100,
        rowGap: CELL_GAP,
    },
    gridRow: {
        gap: CELL_GAP,
        paddingHorizontal: GRID_PAD,
    },
    cell: {
        width: CELL_SIZE,
        position: "relative",
    },
    thumbPolaroid: {
        width: CELL_SIZE,
        height: CELL_HEIGHT,
        backgroundColor: "#fff",
        paddingTop: THUMB_PAD,
        paddingHorizontal: THUMB_PAD,
        paddingBottom: THUMB_BOTTOM,
        borderRadius: 3,
        shadowColor: "#000",
        shadowOpacity: 0.14,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    thumbPhoto: { flex: 1, borderRadius: 1 },

    checkboxHitArea: {
        position: "absolute",
        top: 6,
        left: 6,
        zIndex: 10,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: "rgba(0,0,0,0.3)",
        backgroundColor: "rgba(255,255,255,0.7)",
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxSelected: {
        backgroundColor: "#D5F7F4",
        borderColor: "#5bc8bf",
    },
    checkmark: { fontSize: 12, lineHeight: 14, color: "#1a8f87" },

    empty: { textAlign: "center", marginTop: 60, color: "rgba(0,0,0,0.4)", alignSelf: "center" },

    stickyBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#F5EDE4",
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.1)",
        padding: 16,
    },
    deleteAllBtn: {
        backgroundColor: "#fde8e8",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(200,0,0,0.15)",
    },
    deleteAllText: { fontSize: 17, color: "#c0392b" },

    backdrop: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.62)",
    },
    overlayContainer: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    overlayKAV: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    innerCard: {
        width: "100%",
        maxWidth: 340,
        backgroundColor: "#F5EDE4",
        borderRadius: 14,
        padding: 20,
        gap: 14,
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
        marginHorizontal: 20,
        position: "relative",
    },
    closeBtn: {
        position: "absolute",
        top: -12,
        right: -12,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 10,
    },
    closeBtnText: { fontSize: 14, color: "#333", lineHeight: 16 },

    overlayPolaroid: {
        width: "100%",
        aspectRatio: 1,
        backgroundColor: "#fff",
        padding: 10,
        paddingBottom: 36,
        borderRadius: 4,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    overlayPhoto: { flex: 1, borderRadius: 2 },

    captionInput: {
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.15)",
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        fontFamily: "IndieFlower",
        color: "#333",
        minHeight: 60,
        textAlignVertical: "top",
        backgroundColor: "rgba(255,255,255,0.6)",
    },
    metaBox: {
        gap: 6,
        paddingVertical: 2,
    },
    metaRow: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
    },
    metaLabel: {
        fontSize: 15,
        color: "rgba(0,0,0,0.5)",
    },
    metaValue: {
        flex: 1,
        fontSize: 16,
        color: "#333",
    },
    saveCaptionBtn: {
        alignSelf: "flex-end",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: "#D5F7F4",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
    },
    saveCaptionBtnDisabled: {
        opacity: 0.55,
    },
    saveCaptionText: {
        fontSize: 15,
        color: "#1f5f5a",
    },

    navRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    navArrow: { padding: 8 },
    navArrowText: { fontSize: 34, color: "#333", lineHeight: 38 },
    navArrowDisabled: { color: "rgba(0,0,0,0.2)" },
    counter: { fontSize: 15, color: "rgba(0,0,0,0.5)" },

    deleteBtn: {
        alignSelf: "center",
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 10,
        backgroundColor: "#fde8e8",
        borderWidth: 1,
        borderColor: "rgba(200,0,0,0.15)",
    },
    deleteBtnText: { fontSize: 16, color: "#c0392b" },

    addCell: {
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    addPlus: { fontSize: 28, color: "rgba(0,0,0,0.3)", lineHeight: 32 },
    addLabel: { fontSize: 11, color: "rgba(0,0,0,0.4)", textAlign: "center" },
});
