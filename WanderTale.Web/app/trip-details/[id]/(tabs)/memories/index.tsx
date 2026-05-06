import { ImageBackground, Pressable, ScrollView, StyleSheet, View } from "react-native";
import TripSectionTabs from "@/components/trip-section-tabs";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getTripById } from "@/api/trips";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import MemoryCarousel from "@/components/image-carousel";
import { api_url } from "@/api/config";
import { getPhotos } from "@/api/photo";
import { getEntries } from "@/api/entries";
import { Entry } from "@/types/entry";
import { FormatDate } from "@/components/format-date";

export default function MemoriesScreen() {
    const { id } = useLocalSearchParams<{ id: string | string[] }>();
    const tripId = Array.isArray(id) ? id[0] : id;

    const { data: trip } = useQuery({
        queryKey: ["trip", tripId],
        queryFn: () => getTripById(String(tripId)),
        enabled: !!tripId,
    });

    const { data: photos = [] } = useQuery({
        queryKey: ["photos", tripId],
        queryFn: () => getPhotos(tripId),
        enabled: !!tripId,
    });

    const { data: entries = [] } = useQuery({
        queryKey: ["entries", tripId],
        queryFn: () => getEntries(tripId),
        enabled: !!tripId,
    });

    const images = photos.map((photo) => `${api_url}${photo.imageUri}`);

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.top}>
                <AppText size={30}>{trip?.title ?? "Namnlös resa"}</AppText>
            </View>

            <View style={styles.bottom}>
                <ImageBackground
                    source={require("@/assets/images/TheWorld.png")}
                    imageStyle={styles.paperImg}
                    style={{ flex: 1 }}
                >
                    <View style={styles.tabsWrapper}>
                        <TripSectionTabs tripId={tripId} />
                    </View>

                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        overScrollMode="never"
                        contentContainerStyle={styles.scrollContent}
                    >
                        <MemoryCarousel images={images} tripId={tripId} />

                        {entries.length > 0 && (
                            <View style={styles.entriesSection}>
                                <AppText size={20} style={styles.entriesHeading}>Anteckningar</AppText>
                                {entries.map((entry: Entry) => (
                                    <Pressable
                                        key={entry.id}
                                        style={styles.entryRow}
                                        onPress={() =>
                                            router.push(`/trip-details/${tripId}/entry/${entry.id}`)
                                        }
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
                    </ScrollView>
                </ImageBackground>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F5EDE4" },
    top: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingTop: 10,
        paddingBottom: 10,
        borderBottomWidth: 15,
        borderBottomColor: "#C0C0C0",
    },
    bottom: { flex: 7, alignItems: "stretch" },
    tabsWrapper: {
        alignItems: "center",
        position: "absolute",
        top: 0,
        width: "100%",
        zIndex: 10,
    },
    paperImg: { opacity: 0.6 },
    content: { width: "100%", marginTop: 60 },
    scrollContent: { paddingBottom: 40, paddingTop: 6 },
    entriesSection: {
        marginTop: 28,
        paddingHorizontal: 24,
        gap: 8,
    },
    entriesHeading: { marginBottom: 8 },
    entryRow: {
        backgroundColor: "rgba(255,255,255,0.55)",
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 2,
    },
    entryDate: { fontSize: 13, color: "rgba(0,0,0,0.45)" },
    entryTitle: { fontSize: 17 },
});
