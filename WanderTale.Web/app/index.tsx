import {View, Text, ImageBackground, Pressable, StyleSheet, FlatList} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {getTrips} from "@/api/trips";
import {SafeAreaView} from "react-native-safe-area-context";
import {Ionicons} from "@expo/vector-icons";
import {router} from "expo-router";
import {useMemo, useState} from "react";
import {AppText} from "@/components/appText";

type Trip = { id: string; title: string; startDate: string | null; endDate: string | null };

function safeDate(value: string | null) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

function formatDate(value: string | null) {
    const d = safeDate(value);
    if (!d) return "—";
    return d.toLocaleDateString("sv-SE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export default function Index() {
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
            const end = safeDate(t.endDate);
            return end ? end >= today : true;
        });

        const done = trips.filter((t) => {
            const end = safeDate(t.endDate);
            return end ? end < today : false;
        });

        upcoming.sort((a, b) => {
            const aStart = safeDate(a.startDate)?.getTime() ?? 0;
            const bStart = safeDate(b.startDate)?.getTime() ?? 0;
            return aStart - bStart;
        });

        done.sort((a, b) => {
            const aEnd = safeDate(a.endDate)?.getTime() ?? 0;
            const bEnd = safeDate(b.endDate)?.getTime() ?? 0;
            return bEnd - aEnd;
        });

        return active === "upcoming" ? upcoming : done;
    }, [trips, active]);

    return (
        <SafeAreaView style={styles.screen}>
            {isLoading && (
                <Text style={{padding: 16}}>
                    Loading...
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
                            <Pressable style={{alignItems: "center"}} onPress={() => router.push("/planTrip")}>
                                <Ionicons name="location-outline" size={40} color="#333"/>
                                <AppText style={styles.iconText}>Ny resa</AppText>
                            </Pressable>
                        </View></View>
                    <View style={styles.bottom}>
                        <ImageBackground
                            source={require("@/assets/images/TheWorld.png")}
                            style={{flex: 1}}
                            resizeMode="cover"
                        >
                            <View style={styles.sectionTabs}>
                                <Pressable onPress={() => setActive("upcoming")} hitSlop={10}>
                                    <AppText style={[styles.sectionTab, active === "upcoming" && styles.sectionTabActive]}>
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
                                    <Pressable style={styles.tripCard}>
                                        <View style={styles.tripRow}>
                                            <AppText style={styles.tripTitle}>{item.title}</AppText>
                                            <Text style={styles.tripDate}>
                                                {formatDate(item.startDate)}
                                            </Text>
                                        </View>
                                    </Pressable>
                                )}
                            />
                        </ImageBackground>
                    </View>
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: "#F5EDE4"},

    newTrip: {
        marginTop: 16,
        alignItems: "center",
        paddingVertical: 20,
    },

    top: {
        flex: 1, alignItems: "center",
        justifyContent: "center",
        borderBottomWidth: 15,
        borderBottomColor: "#C0C0C0",
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
    },
    sectionTabActive: {
        fontSize: 28,
        opacity: 1,
        textDecorationLine: "underline",
    },

    tripCard: {
        alignSelf: "center",
        width: "100%",
        maxWidth: 350,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "#D5F7F4",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
    },
    tripTitle: {
        fontSize: 20,
        fontWeight: "600",
    },

    tripDate: {
        marginTop: 4,
        fontSize: 13,
        opacity: 0.6,
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
})
