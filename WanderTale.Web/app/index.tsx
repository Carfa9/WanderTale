import {View, Text, ImageBackground, Pressable, StyleSheet, FlatList, Button} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {getTrips} from "@/api/trips";
import {SafeAreaView} from "react-native-safe-area-context";
import {Ionicons} from "@expo/vector-icons";
import {router} from "expo-router";
import {useMemo, useState} from "react";
import {AppText} from "@/components/app-text";
import {Trip} from "@/types/trip";
import {FormatDate, SafeDate} from "@/components/format-date";
import {useTheme} from "@/context/ThemeContext";

export default function Index() {
    const {theme} = useTheme();
    const tokens = theme.tokens;
    const styles = createStyles(tokens);

    const {data, isLoading, error} = useQuery<Trip[]>({
        queryKey: ["trips"],
        queryFn: getTrips,
    });

    const [active, setActive] = useState<"upcoming" | "done">("upcoming");
    const trips = data ?? [];
    console.log("Trips:", trips);

    const visibleTrips = useMemo(() => {
        const today = new Date();

        const upcoming = trips.filter((t) => {
            const end = SafeDate(t.endDate);
            return end ? end >= today : true;
        });

        const done = trips.filter((t) => {
            const end = SafeDate(t.endDate);
            return end ? end < today : false;
        });

        upcoming.sort((a, b) => {
            const aStart = SafeDate(a.startDate)?.getTime() ?? 0;
            const bStart = SafeDate(b.startDate)?.getTime() ?? 0;
            return aStart - bStart;
        });

        done.sort((a, b) => {
            const aEnd = SafeDate(a.endDate)?.getTime() ?? 0;
            const bEnd = SafeDate(b.endDate)?.getTime() ?? 0;
            return bEnd - aEnd;
        });

        return active === "upcoming" ? upcoming : done;
    }, [trips, active]);

    return (
        <SafeAreaView style={styles.screen}>
            {isLoading && (
                <Text style={{padding: 16}}>
                    Laddar...
                </Text>
            )}

            {error && (
                <Text style={{padding: 16}}>
                    Error: {String((error as any)?.message ?? error)}
                </Text>
            )}
            {!isLoading && !error && (
                <>
                    <View style={styles.top}>
                        <AppText size={40}>Mina resor</AppText>
                        <View style={styles.newTrip}>
                            <Pressable style={{alignItems: "center"}} onPress={() => router.push("/plan-trip")}>
                                <Ionicons name="location-outline" size={40} color={tokens.textPrimary}/>
                                <AppText style={styles.iconText}>Ny resa</AppText>
                            </Pressable>
                        </View></View>
                    <View style={styles.bottom}>
                        <ImageBackground
                            source={require("@/assets/images/TheWorld.png")}
                            style={styles.mapBg}
                            imageStyle={styles.mapImage}
                            resizeMode="cover"
                        >
                            <View style={styles.sectionTabs}>
                                <Pressable onPress={() => setActive("upcoming")} hitSlop={10}>
                                    <AppText
                                        style={[styles.sectionTab, active === "upcoming" && styles.sectionTabActive]}>
                                        Kommande
                                    </AppText>
                                </Pressable>

                                <Pressable onPress={() => setActive("done")} hitSlop={10}>
                                    <AppText style={[styles.sectionTab, active === "done" && styles.sectionTabActive]}>
                                        Minnen
                                    </AppText>
                                </Pressable>
                            </View>
                            <FlatList
                                contentContainerStyle={styles.listContent}
                                data={visibleTrips}
                                keyExtractor={(trip) => trip.id}
                                renderItem={({item}) => (
                                    <Pressable style={styles.tripCard} onPress={() => router.push({
                                        pathname: "/trip-details/[id]",
                                        params: {id: item.id},
                                    })}>
                                        <View style={styles.tripRow}>
                                            <AppText style={styles.tripTitle}>{item.title}</AppText>
                                            <Text style={styles.tripDate}>
                                                {FormatDate(item.startDate)}
                                            </Text>
                                        </View>
                                    </Pressable>
                                )}
                            />
                        </ImageBackground>
                        <Pressable
                            onPress={() => {
                                router.push("/settings");
                            }}
                            hitSlop={12}
                            style={({pressed}) => [
                                styles.settingsBtn,
                                {backgroundColor: tokens.background},
                                pressed && styles.settingsBtnPressed,
                            ]}
                        >
                            <Ionicons name="contrast-outline" size={24} color={tokens.textPrimary}/>
                        </Pressable>
                    </View>
                </>
                
            )}
        </SafeAreaView>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.background},

    newTrip: {
        marginTop: 16,
        alignItems: "center",
        paddingVertical: 20,
    },

    top: {
        flex: 1, alignItems: "center",
        justifyContent: "center",
        borderBottomWidth: 15,
        borderBottomColor: theme.border,
    },

    headline: {
        fontSize: 30,
        letterSpacing: 1
    },

    iconText: {
        fontSize: 22,
    },

    bottom: {
        flex: 2
    },

    mapBg: {
        flex: 1,
        backgroundColor: theme.surfaceAlt,
    },

    mapImage: {
        opacity: theme.background === "#12192A" ? 0.18 : 0.62,
    },

    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        gap: 16,
    },

    sectionTabs: {
        flexDirection: "row",
        gap: 18,
        paddingHorizontal: 50,
        paddingTop: 16,
        paddingBottom: 6,
        alignItems: "flex-end",
        justifyContent: "space-between",
    },
    sectionTab: {
        opacity: 0.40,
        fontSize: 23,
        lineHeight: 30,
        color: theme.textSecondary,
    },
    sectionTabActive: {
        fontSize: 28,
        opacity: 1,
        textDecorationLine: "underline",
        color: theme.textPrimary,
    },

    tripCard: {
        alignSelf: "center",
        width: "100%",
        maxWidth: 350,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: theme.accentSoft,
        borderWidth: 1,
        borderColor: theme.borderLight,
        shadowColor: theme.shadow,
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: {width: 0, height: 3},
        elevation: 3,
    },
    tripTitle: {
        fontSize: 20,
        fontWeight: "600",
    },

    tripDate: {
        marginTop: 4,
        fontSize: 13,
        opacity: 0.6,
        color: theme.textPrimary
    },

    tripRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    sectionTabs1: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingHorizontal: 16,
        paddingVertical: 10,
    },

    settingsBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },

    settingsBtnPressed: {
        opacity: 0.9,
        transform: [{scale: 0.98}],
    },
})
