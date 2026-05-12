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
import {useTheme} from "@/context/ThemeContext";

export default function MemoriesScreen() {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);
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

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
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
    bottom: { flex: 7, alignItems: "stretch" },
    tabsWrapper: {
        alignItems: "center",
        position: "absolute",
        top: 0,
        width: "100%",
        zIndex: 10,
    },
    paperImg: { opacity: 0.42 },
    content: { width: "100%", marginTop: 60 },
    scrollContent: { paddingBottom: 40, paddingTop: 6 },
    entriesSection: {
        marginTop: 26,
        paddingHorizontal: 24,
        gap: 10,
    },
    entriesHeading: {
        marginBottom: 2,
        color: theme.textPrimary,
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
    entryDate: { fontSize: 13, color: theme.textMuted },
    entryTitle: { fontSize: 17 },
});
