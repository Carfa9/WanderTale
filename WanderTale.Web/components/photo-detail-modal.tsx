import React, {useState} from "react";
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {Image} from "expo-image";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {AppText} from "@/components/app-text";
import {FormatDate} from "@/components/format-date";
import {useTheme} from "@/context/ThemeContext";
import {deletePhoto, resolvePhotoImageSource, updatePhotoCaption} from "@/api/photo";
import {Photo} from "@/types/photo";
import {useAuth} from "@/context/AuthContext";

type Props = {
    visible: boolean;
    photos: Photo[];
    index: number;
    tripId: string;
    showAlbumLink?: boolean;
    onClose: () => void;
    onViewAlbum?: () => void;
    onIndexChange?: (index: number) => void;
};

export default function PhotoDetailModal({
    visible,
    photos,
    index,
    tripId,
    showAlbumLink = false,
    onClose,
    onViewAlbum,
    onIndexChange,
}: Props) {
    const {theme} = useTheme();
    const {session} = useAuth();
    const styles = createStyles(theme.tokens);
    const queryClient = useQueryClient();
    const [captions, setCaptions] = useState<Record<string, string>>({});
    const [isEditingCaption, setIsEditingCaption] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const currentPhoto = photos[index] ?? null;
    const currentCaption = currentPhoto ? captions[currentPhoto.id] ?? currentPhoto.caption ?? "" : "";

    const deleteMutation = useMutation({
        mutationFn: (photoId: string) => deletePhoto(photoId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["photos", tripId]});
        },
        onError: () => Alert.alert("Fel", "Kunde inte ta bort bilden."),
    });

    const captionMutation = useMutation({
        mutationFn: ({photoId, caption}: { photoId: string; caption: string | null }) =>
            updatePhotoCaption(photoId, caption),
        onSuccess: () => queryClient.invalidateQueries({queryKey: ["photos", tripId]}),
    });

    const saveCaption = async (photo: Photo) => {
        const local = captions[photo.id];
        if (local === undefined || local === (photo.caption ?? "")) return;

        try {
            const nextCaption = local.trim() ? local.trim() : null;
            await captionMutation.mutateAsync({
                photoId: photo.id,
                caption: nextCaption,
            });
            setCaptions((prev) => ({...prev, [photo.id]: nextCaption ?? ""}));
        } catch {
            Alert.alert("Fel", "Kunde inte spara bildtexten.");
        }
    };

    const close = async () => {
        if (currentPhoto) {
            await saveCaption(currentPhoto);
        }
        setIsEditingCaption(false);
        onClose();
    };

    const goToPhoto = async (nextIndex: number) => {
        if (currentPhoto) {
            await saveCaption(currentPhoto);
        }
        setIsEditingCaption(false);
        onIndexChange?.(nextIndex);
    };

    const toggleEditing = () => {
        if (isEditingCaption) {
            Keyboard.dismiss();
        }

        setIsEditingCaption((prev) => !prev);
    };

    const handleDeleteSingle = (photo: Photo) => {
        setMenuOpen(false);
        Alert.alert("Ta bort bild", "Vill du ta bort den här bilden?", [
            {text: "Avbryt", style: "cancel"},
            {
                text: "Ta bort",
                style: "destructive",
                onPress: async () => {
                    await deleteMutation.mutateAsync(photo.id);
                    close();
                },
            },
        ]);
    };

    const openEditFromMenu = () => {
        setMenuOpen(false);
        if (!isEditingCaption) setIsEditingCaption(true);
    };

    const openAlbum = () => {
        if (currentPhoto) {
            void saveCaption(currentPhoto);
        }
        setIsEditingCaption(false);
        onViewAlbum?.();
    };

    if (!visible) return null;

    return (
        <View style={styles.modalRoot}>
            <Pressable style={styles.backdrop} onPress={close}/>

            <View style={styles.overlayContainer} pointerEvents="box-none">
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.overlayKAV}
                    pointerEvents="box-none"
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.innerCard}>
                            <View style={styles.cardHeader}>
                                <Pressable
                                    style={styles.headerButton}
                                    onPress={() => setMenuOpen(true)}
                                    hitSlop={10}
                                >
                                    <Ionicons
                                        name="ellipsis-vertical"
                                        size={20}
                                        color={theme.tokens.textPrimary}
                                    />
                                </Pressable>

                                <Pressable style={styles.headerButton} onPress={close} hitSlop={10}>
                                    <Ionicons name="close" size={20} color={theme.tokens.textPrimary}/>
                                </Pressable>
                            </View>

                            {currentPhoto && (
                                <>
                                    <View style={styles.overlayPolaroid}>
                                        <Image
                                            source={resolvePhotoImageSource(currentPhoto.imageUri, session?.token, currentPhoto.id)}
                                            style={styles.overlayPhoto}
                                            contentFit="cover"
                                        />
                                    </View>

                                    <View style={styles.detailsPanel}>
                                        <View style={styles.metaBox}>
                                            {currentPhoto.photoDate && (
                                                <View style={styles.metaRow}>
                                                    <Ionicons
                                                        name="calendar-outline"
                                                        size={16}
                                                        color={theme.tokens.textSecondary}
                                                    />
                                                    <AppText style={styles.metaValue}>
                                                        {FormatDate(currentPhoto.photoDate)}
                                                    </AppText>
                                                </View>
                                            )}
                                            {currentPhoto.location && (
                                                <View style={styles.metaRow}>
                                                    <Ionicons
                                                        name="location-outline"
                                                        size={16}
                                                        color={theme.tokens.textSecondary}
                                                    />
                                                    <AppText style={styles.metaValue}>{currentPhoto.location}</AppText>
                                                </View>
                                            )}
                                        </View>

                                        <Pressable style={styles.memoryRow} onPress={toggleEditing}>
                                            <View style={styles.memoryTextBlock}>
                                                <AppText style={styles.memoryLabel}>Minne</AppText>
                                                <AppText
                                                    style={[
                                                        styles.memoryValue,
                                                        !currentCaption && styles.memoryValuePlaceholder,
                                                    ]}
                                                >
                                                    {currentCaption || "Tryck för att lägga till ett minne..."}
                                                </AppText>
                                            </View>

                                            <Ionicons
                                                name={isEditingCaption ? "close-outline" : "create-outline"}
                                                size={20}
                                                color={theme.tokens.textSecondary}
                                            />
                                        </Pressable>

                                        {isEditingCaption && (
                                            <View style={styles.captionEditor}>
                                                <TextInput
                                                    style={styles.captionInput}
                                                    value={currentCaption}
                                                    onChangeText={(text) => {
                                                        setCaptions((prev) => ({
                                                            ...prev,
                                                            [currentPhoto.id]: text,
                                                        }));
                                                    }}
                                                    placeholder="Skriv ett minne..."
                                                    placeholderTextColor={theme.tokens.textMuted}
                                                    multiline
                                                />

                                                <Pressable
                                                    style={[
                                                        styles.saveCaptionBtn,
                                                        captionMutation.isPending && styles.saveCaptionBtnDisabled,
                                                    ]}
                                                    disabled={captionMutation.isPending}
                                                    onPress={async () => {
                                                        await saveCaption(currentPhoto);
                                                        Keyboard.dismiss();
                                                        setIsEditingCaption(false);
                                                    }}
                                                >
                                                    <AppText style={styles.saveCaptionText}>
                                                        {captionMutation.isPending ? "Sparar..." : "Spara"}
                                                    </AppText>
                                                </Pressable>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.divider}/>

                                    <View style={styles.navRow}>
                                        <Pressable
                                            onPress={() => goToPhoto(Math.max(0, index - 1))}
                                            disabled={index === 0}
                                            style={[styles.navArrow, index === 0 && styles.navArrowDisabled]}
                                        >
                                            <Ionicons
                                                name="chevron-back"
                                                size={20}
                                                color={index === 0 ? theme.tokens.textMuted : theme.tokens.textPrimary}
                                            />
                                        </Pressable>

                                        <AppText style={styles.counter}>
                                            {index + 1} / {photos.length}
                                        </AppText>

                                        <Pressable
                                            onPress={() => goToPhoto(Math.min(photos.length - 1, index + 1))}
                                            disabled={index === photos.length - 1}
                                            style={[
                                                styles.navArrow,
                                                index === photos.length - 1 && styles.navArrowDisabled,
                                            ]}
                                        >
                                            <Ionicons
                                                name="chevron-forward"
                                                size={20}
                                                color={
                                                    index === photos.length - 1
                                                        ? theme.tokens.textMuted
                                                        : theme.tokens.textPrimary
                                                }
                                            />
                                        </Pressable>
                                    </View>

                                    {showAlbumLink && (
                                        <Pressable style={styles.albumLink} onPress={openAlbum}>
                                            <Ionicons name="images-outline" size={15} color={theme.tokens.surface}/>
                                            <AppText style={styles.albumLinkText}>Visa album</AppText>
                                        </Pressable>
                                    )}
                                </>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>

            {menuOpen && (
                <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
                    <Pressable style={styles.menuSheet}>
                        <Pressable style={styles.menuAction} onPress={openEditFromMenu}>
                            <Ionicons
                                name={currentCaption ? "create-outline" : "add-circle-outline"}
                                size={20}
                                color={theme.tokens.textPrimary}
                            />
                            <AppText style={styles.menuActionText}>
                                {currentCaption ? "Redigera minne" : "Lägg till minne"}
                            </AppText>
                        </Pressable>

                        <Pressable
                            style={styles.menuAction}
                            disabled={deleteMutation.isPending || !currentPhoto}
                            onPress={() => currentPhoto && handleDeleteSingle(currentPhoto)}
                        >
                            <Ionicons name="trash-outline" size={20} color={theme.tokens.error}/>
                            <AppText style={[styles.menuActionText, styles.menuActionTextDanger]}>
                                {deleteMutation.isPending ? "Tar bort..." : "Ta bort bild"}
                            </AppText>
                        </Pressable>
                    </Pressable>
                </Pressable>
            )}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    modalRoot: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
        elevation: 100,
    },
    backdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.shadow,
    },
    overlayContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    overlayKAV: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    scrollContent: {
        flexGrow: 1,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
        paddingVertical: 24,
    },
    innerCard: {
        width: "100%",
        maxWidth: 360,
        borderRadius: 18,
        padding: 18,
        gap: 14,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.borderLight,
        shadowColor: theme.shadow,
        shadowOpacity: 0.35,
        shadowRadius: 18,
        shadowOffset: {width: 0, height: 8},
        elevation: 12,
        position: "relative",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: -4,
        marginHorizontal: -4,
    },
    headerButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
    },
    overlayPolaroid: {
        width: "100%",
        aspectRatio: 1,
        backgroundColor: theme.surface,
        padding: 10,
        paddingBottom: 32,
        borderRadius: 4,
        shadowColor: theme.shadow,
        shadowOpacity: 0.14,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 4},
        elevation: 4,
    },
    overlayPhoto: {
        flex: 1,
        borderRadius: 3,
    },
    albumLink: {
        minHeight: 38,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: theme.accentDark,
    },
    albumLinkText: {
        fontFamily: "Nunito_700Bold",
        fontSize: 13,
        lineHeight: 17,
        color: theme.surface,
    },
    detailsPanel: {
        gap: 10,
        paddingHorizontal: 2,
    },
    metaBox: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    metaRow: {
        minHeight: 28,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: theme.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.borderLight,
    },
    metaValue: {
        fontFamily: "Nunito_700Bold",
        fontSize: 13,
        lineHeight: 17,
        color: theme.textSecondary,
    },
    memoryRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: theme.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.borderLight,
    },
    memoryTextBlock: {
        flex: 1,
    },
    memoryLabel: {
        fontFamily: "Nunito_700Bold",
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 0.6,
        color: theme.textSecondary,
        textTransform: "uppercase",
    },
    memoryValue: {
        marginTop: 4,
        fontSize: 16,
        lineHeight: 23,
        color: theme.textPrimary,
    },
    memoryValuePlaceholder: {
        color: theme.textMuted,
        fontStyle: "italic",
    },
    captionEditor: {
        gap: 8,
    },
    captionInput: {
        borderWidth: 1,
        borderColor: theme.borderLight,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        fontFamily: "IndieFlower",
        color: theme.textPrimary,
        minHeight: 58,
        maxHeight: 110,
        textAlignVertical: "top",
        backgroundColor: theme.surface,
    },
    saveCaptionBtn: {
        alignSelf: "flex-end",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: theme.accentSoft,
        borderWidth: 1,
        borderColor: theme.borderLight,
    },
    saveCaptionBtnDisabled: {
        opacity: 0.55,
    },
    saveCaptionText: {
        fontSize: 15,
        color: theme.accentDark,
    },
    divider: {
        height: 1,
        backgroundColor: theme.borderLight,
        opacity: 0.7,
    },
    navRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 4,
    },
    navArrow: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 18,
        backgroundColor: theme.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.borderLight,
    },
    navArrowDisabled: {
        opacity: 0.4,
    },
    counter: {
        fontFamily: "Nunito_700Bold",
        fontSize: 13,
        letterSpacing: 0.4,
        color: theme.textMuted,
    },
    menuBackdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
        gap: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    menuActionText: {
        fontSize: 17,
        color: theme.textPrimary,
    },
    menuActionTextDanger: {
        color: theme.error,
    },
});
