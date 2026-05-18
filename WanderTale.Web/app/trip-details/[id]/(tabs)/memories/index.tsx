import {ImageBackground, Pressable, ScrollView, StyleSheet, View} from "react-native";
import TripSectionTabs from "@/components/trip-section-tabs";
import {router, useLocalSearchParams} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {getTripById} from "@/api/trips";
import {SafeAreaView} from "react-native-safe-area-context";
import {AppText} from "@/components/app-text";
import MemoryCarousel from "@/components/image-carousel";
import {getPhotos, resolvePhotoImageUri} from "@/api/photo";
import {getEntries} from "@/api/entries";
import {getStopsByTripId} from "@/api/stops";
import {Entry} from "@/types/entry";
import {FormatDate} from "@/components/format-date";
import {useTheme} from "@/context/ThemeContext";
import {useState} from "react";
import {Ionicons} from "@expo/vector-icons";
import PhotoDetailModal from "@/components/photo-detail-modal";

export default function MemoriesScreen() {
    const [notesOpen, setNotesOpen] = useState(false);
    const [photoModalIndex, setPhotoModalIndex] = useState<number | null>(null);
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);
    const {id} = useLocalSearchParams<{ id: string | string[] }>();
    const tripId = Array.isArray(id) ? id[0] : id;

    const {data: trip} = useQuery({
        queryKey: ["trip", tripId],
        queryFn: () => getTripById(String(tripId)),
        enabled: !!tripId,
    });

    const {data: photos = []} = useQuery({
        queryKey: ["photos", tripId],
        queryFn: () => getPhotos(tripId),
        enabled: !!tripId,
    });

    const {data: entries = []} = useQuery({
        queryKey: ["entries", tripId],
        queryFn: () => getEntries(tripId),
        enabled: !!tripId,
    });

    const {data: stops = []} = useQuery({
        queryKey: ["stops", tripId],
        queryFn: () => getStopsByTripId(String(tripId)),
        enabled: !!tripId,
    });

    const images = photos.map((photo) => resolvePhotoImageUri(photo.imageUri));
    const latestEntry = entries[0];
    const journalPreview =
        latestEntry?.content?.trim() ||
        latestEntry?.title?.trim() ||
        "Skriv ner små ögonblick, platser och tankar från resan.";
    const entryCountLabel = `${entries.length} ${entries.length === 1 ? "anteckning" : "anteckningar"}`;
    const photoCountLabel = `${photos.length} ${photos.length === 1 ? "bild" : "bilder"}`;

    const openJournal = () => {
        if (entries.length > 0) {
            setNotesOpen((prev) => !prev);
            return;
        }

        router.push(`/trip-details/${tripId}/new-entry`);
    };

    const openAlbumFromModal = () => {
        router.push(`/trip-details/${tripId}/album`);
        setPhotoModalIndex(null);
    };

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.top}>
                <AppText size={30}>{trip?.title ?? "Namnlös resa"}</AppText>
            </View>

            <View style={styles.bottom}>
                <ImageBackground
                    source={require("@/assets/images/TheWorld.png")}
                    imageStyle={styles.paperImg}
                    style={styles.background}
                >
                    <View style={styles.tabsWrapper}>
                        <TripSectionTabs tripId={tripId}/>
                    </View>

                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        overScrollMode="never"
                        contentContainerStyle={styles.scrollContent}
                    >
                        {photos.length > 0 ? (
                            <>
                                <MemoryCarousel
                                    images={images}
                                    tripId={tripId}
                                    onPhotoPress={setPhotoModalIndex}
                                />
                                <Pressable
                                    style={styles.albumPill}
                                    onPress={() => router.push(`/trip-details/${tripId}/album`)}
                                >
                                    <Ionicons name="camera-outline" size={15} color={theme.tokens.surface}/>
                                    <AppText style={styles.albumPillText}>
                                        {photoCountLabel} · Visa album →
                                    </AppText>
                                </Pressable>
                            </>
                        ) : (
                            <View style={styles.emptyMemoriesBox}>
                                <AppText style={styles.emptyMemoriesText}>
                                    Inspiration eller minnen
                                </AppText>

                                <Pressable
                                    style={styles.addMemoryButton}
                                    onPress={() => router.push(`/trip-details/${tripId}/new-photo`)}
                                >
                                    <AppText style={styles.addMemoryButtonText}>
                                        Lägg till foto
                                    </AppText>
                                </Pressable>
                            </View>
                        )}

                        <View style={styles.entriesSection}>
                            <Pressable style={styles.journalCard} onPress={openJournal}>
                                <View pointerEvents="none" style={styles.journalTexture}/>

                                <View style={styles.journalHeader}>
                                    <Ionicons name="pencil-outline" size={18} color={theme.tokens.textSecondary}/>
                                    <AppText size={25} style={styles.journalHeading}>
                                        Resejournal
                                    </AppText>
                                </View>

                                <AppText style={styles.journalPreview} numberOfLines={2}>
                                    “{journalPreview}”
                                </AppText>

                                <View style={styles.journalDivider}/>

                                <View style={styles.journalFooter}>
                                    <View style={styles.journalMeta}>
                                        <Ionicons name="reader-outline" size={15} color={theme.tokens.textSecondary}/>
                                        <AppText style={styles.journalMetaText}>{entryCountLabel}</AppText>
                                    </View>
                                    <AppText style={styles.journalCta}>
                                        {entries.length > 0 ? "Öppna resejournal →" : "Börja skriva →"}
                                    </AppText>
                                </View>
                            </Pressable>

                            {notesOpen && entries.length > 0 && (
                                <View style={styles.entryList}>
                                    {entries.map((entry: Entry) => (
                                        <Pressable
                                            key={entry.id}
                                            style={styles.entryRow}
                                            onPress={() => router.push(`/trip-details/${tripId}/entry/${entry.id}`)}
                                        >
                                            <AppText style={styles.entryDate}>
                                                {FormatDate(entry.entryDate ?? null) ?? ""}
                                            </AppText>

                                            <AppText style={styles.entryTitle} numberOfLines={1}>
                                                {entry.title ?? "Namnlös anteckning"}
                                            </AppText>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Ionicons name="flag-outline" size={16} color={theme.tokens.textSecondary}/>
                                <AppText style={styles.summaryText}>{stops.length} stopp</AppText>
                            </View>
                            <View style={styles.summaryDot}/>
                            <View style={styles.summaryItem}>
                                <Ionicons name="reader-outline" size={16} color={theme.tokens.textSecondary}/>
                                <AppText style={styles.summaryText}>{entryCountLabel}</AppText>
                            </View>
                            <View style={styles.summaryDot}/>
                            <View style={styles.summaryItem}>
                                <Ionicons name="images-outline" size={16} color={theme.tokens.textSecondary}/>
                                <AppText style={styles.summaryText}>{photoCountLabel}</AppText>
                            </View>
                        </View>
                    </ScrollView>
                </ImageBackground>
            </View>

            <PhotoDetailModal
                visible={photoModalIndex !== null}
                photos={photos}
                index={photoModalIndex ?? 0}
                tripId={tripId}
                showAlbumLink
                onClose={() => setPhotoModalIndex(null)}
                onViewAlbum={openAlbumFromModal}
                onIndexChange={setPhotoModalIndex}
            />
        </SafeAreaView>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.background},
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
    bottom: {flex: 7, alignItems: "stretch"},
    background: {flex: 1},
    tabsWrapper: {
        alignItems: "center",
        position: "absolute",
        top: 0,
        width: "100%",
        zIndex: 10,
    },
    paperImg: {opacity: 0.42},
    content: {width: "100%", marginTop: 60},
    scrollContent: {paddingBottom: 24, paddingTop: 2, paddingHorizontal: 24},
    albumPill: {
        alignSelf: "center",
        minHeight: 32,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        marginTop: -4,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: theme.accentDark,
        borderWidth: 1,
        borderColor: theme.isDark ? theme.borderLight : "rgba(255, 254, 249, 0.56)",
        shadowColor: theme.shadow,
        shadowOpacity: 0.16,
        shadowRadius: 10,
        shadowOffset: {width: 0, height: 4},
        elevation: 3,
    },
    albumPillText: {
        fontFamily: "Nunito_700Bold",
        fontSize: 13,
        lineHeight: 18,
        color: theme.surface,
    },
    entriesSection: {
        marginTop: 14,
        gap: 10,
    },
    
    journalCard: {
        position: "relative",
        overflow: "hidden",
        width: "100%",
        minHeight: 150,
        paddingHorizontal: 22,
        paddingTop: 15,
        paddingBottom: 14,
        borderRadius: 14,
        backgroundColor: theme.isDark ? theme.surface : theme.background,
        borderWidth: 1,
        borderColor: theme.borderLight,
        shadowColor: theme.shadow,
        shadowOpacity: 0.11,
        shadowRadius: 12,
        shadowOffset: {width: 0, height: 5},
        elevation: 4,
        transform: [{rotate: "-0.35deg"}],
    },
    journalTexture: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.surfaceAlt,
        opacity: theme.isDark ? 0.06 : 0.16,
    },
    journalHeader: {
        position: "relative",
        zIndex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
    },
    journalHeading: {
        color: theme.accentDark,
    },
    journalMetaText: {
        fontFamily: "Nunito_700Bold",
        fontSize: 13,
        lineHeight: 18,
        color: theme.textSecondary,
    },
    journalPreview: {
        position: "relative",
        zIndex: 1,
        marginTop: 10,
        fontSize: 17,
        lineHeight: 25,
        color: theme.textPrimary,
        opacity: 0.88,
    },
    journalDivider: {
        position: "relative",
        zIndex: 1,
        height: 2,
        marginTop: 10,
        backgroundColor: theme.isDark ? theme.borderLight : theme.accentSoft,
    },
    journalFooter: {
        position: "relative",
        zIndex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginTop: 10,
    },
    journalMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
    },
    journalCta: {
        fontFamily: "Nunito_700Bold",
        fontSize: 14,
        lineHeight: 18,
        color: theme.accentDark,
        textAlign: "right",
    },
    entryList: {
        gap: 8,
        paddingHorizontal: 4,
    },
    entryRow: {
        backgroundColor: theme.surface,
        borderRadius: 9,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 2,
        borderWidth: 1,
        borderColor: theme.borderLight,
    },
    entryDate: {fontSize: 13, color: theme.textMuted},
    entryTitle: {marginTop: 4, fontSize: 17},
    summaryRow: {
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 14,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: theme.isDark ? theme.surface : "rgba(255, 252, 244, 0.82)",
        borderWidth: 1,
        borderColor: theme.borderLight,
        shadowColor: theme.shadow,
        shadowOpacity: 0.07,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 3},
        elevation: 2,
        opacity: 0.92,
    },
    summaryItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    summaryText: {
        fontFamily: "Nunito_700Bold",
        fontSize: 12,
        lineHeight: 16,
        color: theme.textSecondary,
    },
    summaryDot: {
        width: 3,
        height: 3,
        borderRadius: 2,
        backgroundColor: theme.textMuted,
        opacity: 0.7,
    },
    emptyMemoriesBox: {
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.surfaceAlt,
        alignItems: "center",
    },
    emptyMemoriesText: {
        textAlign: "center",
        marginBottom: 12,
        opacity: 0.8,
    },
    addMemoryButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 999,
        backgroundColor: theme.accentSoft,
    },
    addMemoryButtonText: {
        color: theme.textPrimary,
    },
});
