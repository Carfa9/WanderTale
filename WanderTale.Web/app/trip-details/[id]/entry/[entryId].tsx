import React from "react";
import { Dimensions, ImageBackground, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import Carousel from "react-native-reanimated-carousel";
import { AppText } from "@/components/app-text";
import { getEntries } from "@/api/entries";
import { getPhotos } from "@/api/photo";
import { api_url } from "@/api/config";
import { FormatDate } from "@/components/format-date";
import { Photo } from "@/types/photo";

const { width: screenWidth } = Dimensions.get("window");
const PHOTO_WIDTH = Math.min(screenWidth * 0.58, 220);
const PHOTO_HEIGHT = 220;
const POLAROID_PAD = 8;
const POLAROID_BOTTOM = 24;
const CARD_HEIGHT = PHOTO_HEIGHT + POLAROID_PAD + POLAROID_BOTTOM;

export default function EntryDetailScreen() {
    const { id, entryId } = useLocalSearchParams<{ id: string; entryId: string }>();
    const tripId = String(id);

    const { data: entries = [] } = useQuery({
        queryKey: ["entries", tripId],
        queryFn: () => getEntries(tripId),
        enabled: !!tripId,
    });

    const { data: allPhotos = [] } = useQuery({
        queryKey: ["photos", tripId],
        queryFn: () => getPhotos(tripId),
        enabled: !!tripId,
    });

    const entry = entries.find((e) => e.id === entryId) ?? null;
    const entryPhotos = allPhotos.filter((p: Photo) => p.entryId === entryId);

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()}>
                    <AppText style={styles.backText}>‹ Tillbaka</AppText>
                </Pressable>
            </View>

            <ImageBackground
                source={require("@/assets/images/TheWorld.png")}
                style={{ flex: 1 }}
                imageStyle={{ opacity: 0.5 }}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {entry && (
                        <>
                            <AppText size={26} style={styles.entryTitle}>
                                {entry.title ?? "Namnlös anteckning"}
                            </AppText>
                            <AppText style={styles.entryDate}>
                                {FormatDate(entry.entryDate ?? null) ?? ""}
                            </AppText>
                            <AppText style={styles.entryContent}>
                                {entry.content ?? ""}
                            </AppText>
                        </>
                    )}

                    {entryPhotos.length > 0 && (
                        <View style={styles.photosSection}>
                            <AppText size={18} style={styles.photosHeading}>Bilder</AppText>
                            <Carousel
                                width={screenWidth}
                                height={CARD_HEIGHT}
                                data={entryPhotos}
                                mode="parallax"
                                modeConfig={{
                                    parallaxScrollingScale: 0.84,
                                    parallaxScrollingOffset: 44,
                                }}
                                loop={false}
                                renderItem={({ item }: { item: Photo }) => (
                                    <View style={styles.slide}>
                                        <View style={styles.polaroid}>
                                            <Image
                                                source={`${api_url}${item.imageUri}`}
                                                style={styles.photo}
                                                contentFit="cover"
                                            />
                                        </View>
                                    </View>
                                )}
                            />
                        </View>
                    )}

                    <Pressable
                        style={styles.addPhotoButton}
                        onPress={() =>
                            router.push(`/trip-details/${tripId}/new-photo?entryId=${entryId}`)
                        }
                    >
                        <AppText style={styles.addPhotoText}>Lägg till foto</AppText>
                    </Pressable>
                </ScrollView>
            </ImageBackground>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F5EDE4" },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.1)",
    },
    backText: { fontSize: 18 },
    content: { padding: 24, paddingBottom: 60, gap: 12 },
    entryTitle: { marginBottom: 4 },
    entryDate: { fontSize: 14, color: "rgba(0,0,0,0.45)", marginBottom: 12 },
    entryContent: { fontSize: 17, lineHeight: 26 },
    photosSection: { marginTop: 24, marginHorizontal: -24 },
    photosHeading: { marginLeft: 24, marginBottom: 12 },
    slide: { flex: 1, alignItems: "center", justifyContent: "center" },
    polaroid: {
        width: PHOTO_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: "#fff",
        paddingTop: POLAROID_PAD,
        paddingHorizontal: POLAROID_PAD,
        paddingBottom: POLAROID_BOTTOM,
        borderRadius: 4,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
    },
    photo: { flex: 1, borderRadius: 2 },
    addPhotoButton: {
        marginTop: 24,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: "#D5F7F4",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
        alignItems: "flex-start",
    },
    addPhotoText: { fontSize: 18, paddingHorizontal: 20 },
});
