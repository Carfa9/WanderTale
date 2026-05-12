import {Pressable, ScrollView, StyleSheet, View} from "react-native";
import {Image} from "expo-image";
import {router, useLocalSearchParams} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {SafeAreaView} from "react-native-safe-area-context";
import {AppText} from "@/components/app-text";
import {FormatDate} from "@/components/format-date";
import {transportOptionsByKey} from "@/components/transport-options";
import {useTheme} from "@/context/ThemeContext";
import {getStopsByTripId} from "@/api/stops";
import {TravelModeKey} from "@/types/travelMode";

export default function StopsScreen() {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);
    const {id} = useLocalSearchParams<{ id: string | string[] }>();
    const tripId = Array.isArray(id) ? id[0] : id;

    const {data: stops = [], isLoading, error} = useQuery({
        queryKey: ["stops", tripId],
        queryFn: () => getStopsByTripId(String(tripId)),
        enabled: !!tripId,
    });

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
                            <AppText style={styles.order}>#{stop.orderIndex}</AppText>
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
    order: {color: theme.textMuted},
    dateText: {color: theme.textMuted},
    description: {color: theme.textSecondary, lineHeight: 22},
    modeRow: {flexDirection: "row", gap: 8, marginTop: 4},
    modeIcon: {width: 24, height: 24},
    
});
