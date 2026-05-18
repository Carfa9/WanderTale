import React, {useEffect, useState} from "react";
import {
    Alert,
    Dimensions,
    FlatList,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {router, useLocalSearchParams} from "expo-router";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {Image} from "expo-image";
import {AppText} from "@/components/app-text";
import {getTripById} from "@/api/trips";
import {deletePhoto, getPhotos, resolvePhotoImageUri} from "@/api/photo";
import {Photo} from "@/types/photo";
import {useTheme} from "@/context/ThemeContext";
import PhotoDetailModal from "@/components/photo-detail-modal";

const {width: screenWidth} = Dimensions.get("window");

const NUM_COLS = 3;
const GRID_PAD = 12;
const CELL_GAP = 8;
const CELL_SIZE = (screenWidth - GRID_PAD * 2 - CELL_GAP * (NUM_COLS - 1)) / NUM_COLS;
const THUMB_PAD = 4;
const THUMB_BOTTOM = 24;
const CELL_HEIGHT = CELL_SIZE + THUMB_PAD + THUMB_BOTTOM;

export default function AlbumScreen() {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);
    const {id, initialIndex} = useLocalSearchParams<{ id: string; initialIndex?: string }>();
    const tripId = String(id);
    const queryClient = useQueryClient();

    const [enlargedIndex, setEnlargedIndex] = useState<number | null>(null);
    const [overlayIndex, setOverlayIndex] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const {data: trip} = useQuery({
        queryKey: ["trip", tripId],
        queryFn: () => getTripById(tripId),
        enabled: !!tripId,
    });

    const {data: photos = []} = useQuery({
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

    const openOverlay = (index: number) => {
        setOverlayIndex(index);
        setEnlargedIndex(index);
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

    const handleDeleteSelected = () => {
        const count = selectedIds.size;
        Alert.alert(
            "Ta bort bilder",
            `Vill du ta bort ${count} ${count === 1 ? "bild" : "bilder"}?`,
            [
                {text: "Avbryt", style: "cancel"},
                {
                    text: "Ta bort",
                    style: "destructive",
                    onPress: async () => {
                        await Promise.all([...selectedIds].map((photoId) => deletePhoto(photoId)));
                        await queryClient.invalidateQueries({queryKey: ["photos", tripId]});
                        setSelectedIds(new Set());
                    },
                },
            ]
        );
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
                data={[...photos, {id: "__add__"}]}
                numColumns={NUM_COLS}
                keyExtractor={(item) => item.id}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={styles.gridContent}
                renderItem={({item, index}) => {
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
                                    source={resolvePhotoImageUri(photo.imageUri)}
                                    style={styles.thumbPhoto}
                                    contentFit="cover"
                                />
                            </View>
                            <Pressable
                                style={styles.checkboxHitArea}
                                hitSlop={{top: 8, left: 8, bottom: 8, right: 8}}
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

            <PhotoDetailModal
                visible={enlargedIndex !== null}
                photos={photos}
                index={overlayIndex}
                tripId={tripId}
                onClose={() => setEnlargedIndex(null)}
                onIndexChange={(nextIndex) => {
                    setOverlayIndex(nextIndex);
                    setEnlargedIndex(nextIndex);
                }}
            />
        </SafeAreaView>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.background},
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.borderLight,
    },
    backButton: {marginRight: 12},
    backText: {fontSize: 18},
    title: {flex: 1, textAlign: "center"},
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
        backgroundColor: theme.surface,
        paddingTop: THUMB_PAD,
        paddingHorizontal: THUMB_PAD,
        paddingBottom: THUMB_BOTTOM,
        borderRadius: 3,
        shadowColor: theme.shadow,
        shadowOpacity: 0.14,
        shadowRadius: 4,
        shadowOffset: {width: 0, height: 2},
        elevation: 3,
    },
    thumbPhoto: {flex: 1, borderRadius: 1},
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
        borderColor: theme.border,
        backgroundColor: theme.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxSelected: {
        backgroundColor: theme.accentSoft,
        borderColor: theme.accent,
    },
    checkmark: {fontSize: 12, lineHeight: 14, color: theme.accentDark},
    stickyBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.background,
        borderTopWidth: 1,
        borderTopColor: theme.borderLight,
        padding: 16,
    },
    deleteAllBtn: {
        backgroundColor: theme.surfaceAlt,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.error,
    },
    deleteAllText: {fontSize: 17, color: theme.error},
    addCell: {
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    addPlus: {fontSize: 28, color: theme.textMuted, lineHeight: 32},
    addLabel: {fontSize: 11, color: theme.textMuted, textAlign: "center"},
});
