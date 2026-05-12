import {View, StyleSheet, Pressable, ImageBackground, ScrollView} from "react-native";
import {AppText} from "@/components/app-text";
import {useQuery} from "@tanstack/react-query";
import {router, useLocalSearchParams} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {getTripById} from "@/api/trips";
import {SafeAreaView} from "react-native-safe-area-context";
import FieldCard from "@/components/field-card";
import {FormatDate} from "@/components/format-date";
import {TravelModeKey} from "@/types/travelMode";
import {transportOptionsByKey} from "@/components/transport-options";
import {Image} from "expo-image";
import {ExpandableText} from "@/components/expandable-text";
import TripSectionTabs from "@/components/trip-section-tabs";
import {useTheme} from "@/context/ThemeContext";
import {getStopsByTripId} from "@/api/stops";

const FullScreenMessage = ({children}: { children: React.ReactNode }) => (
    <SafeAreaView
        style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
        }}
    >
        <AppText>{children}</AppText>
    </SafeAreaView>
);

export default function TripDetails() {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);

    const {id} = useLocalSearchParams<{ id: string | string[] }>();
    const tripId = Array.isArray(id) ? id[0] : id;

    const {data: trip, isLoading, error} = useQuery({
        queryKey: ["trip", tripId],
        queryFn: () => getTripById(String(tripId)),
        enabled: !!tripId,
    });

    const {data: stops = []} = useQuery({
        queryKey: ["stops", tripId],
        queryFn: () => getStopsByTripId(String(tripId)),
        enabled: !!tripId,
    });

    if (isLoading) return <FullScreenMessage>Laddar…</FullScreenMessage>;
    if (error) return <FullScreenMessage>Något gick fel.</FullScreenMessage>;
    if (!trip) return <FullScreenMessage>Hittar inte resan.</FullScreenMessage>;

    const descriptionText = trip.description?.trim() || "Inget här än..";

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.top}>
                <View style={styles.titleWrapper}>
                    <AppText size={30}>
                        {trip?.title ?? "Namnlös resa"}
                    </AppText>
                </View>
            </View>

            <View style={styles.bottom}>
                <TripSectionTabs tripId={tripId}/>
                <View style={styles.paperStack}>
                    <ImageBackground
                        source={require("@/assets/images/TheWorld.png")}
                        style={styles.paper}
                        imageStyle={styles.paperImg}
                    >

                        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}
                                    overScrollMode="never"
                                    contentContainerStyle={styles.scrollContent}>
                            <FieldCard label="Destination: " value={trip.destination} placeholder="Inget här än.."/>
                            <FieldCard label="Startdatum: " value={FormatDate(trip?.startDate)}
                                       placeholder="Under planering"/>
                            <FieldCard label="Slutdatum: " value={FormatDate(trip.endDate)}
                                       placeholder="Under planering"/>

                            <FieldCard label="Färdsätt: ">
                                {trip.travelModes?.length ? (
                                    <View style={styles.modeRow}>
                                        {trip.travelModes.map((key: TravelModeKey) => (
                                            <Image
                                                key={key}
                                                source={transportOptionsByKey[key]}
                                                style={styles.modeIcon}
                                                contentFit="contain"
                                                tintColor={theme.tokens.textPrimary}
                                            />
                                        ))}
                                    </View>
                                ) : (
                                    <AppText style={styles.fieldValue}>Ej valt</AppText>
                                )}
                            </FieldCard>

                            <FieldCard label="Beskrivning: " stackedValue multiline>
                                <ExpandableText
                                    text={descriptionText}
                                    collapsedLines={1}
                                    textStyle={{textAlign: "left"}}
                                />
                            </FieldCard>

                            <View style={styles.stopsSection}>
                                <View style={styles.stopsHeader}>
                                    <AppText size={20}>Platser längs vägen</AppText>
                                    <Ionicons name="map-outline" size={22} color={theme.tokens.textPrimary}/>
                                </View>
                                <AppText style={styles.stopsText}>
                                    {stops.length > 0
                                        ? `${stops.length} platser tillagda`
                                        : ""}
                                </AppText>
                                <View style={styles.stopButtonSection}>
                                    <Pressable
                                        style={styles.addStopButton}
                                        onPress={() => router.push(`/trip-details/${tripId}/new-stop`)}
                                    >
                                        <AppText style={styles.buttonText}>Lägg till stopp</AppText>
                                    </Pressable>
                                    <Pressable
                                        style={styles.stopsButton}
                                        onPress={() => router.push(`/trip-details/${tripId}/stops`)}
                                    >
                                        <AppText style={styles.stopsButtonText}>Visa stopp</AppText>
                                    </Pressable>
                                </View>
                            </View>

                            <View style={styles.buttonContainer}>
                                <Pressable style={styles.addButton}
                                           onPress={() => router.push(`/trip-details/${tripId}/new-entry`)
                                           }>
                                    <AppText style={styles.addButtonText}>Lägg till anteckning</AppText>
                                </Pressable>
                                <Pressable style={[styles.addButton, styles.addButtonSecond]}
                                           onPress={() => router.push(`/trip-details/${tripId}/new-photo`)}>
                                    <AppText style={styles.addButtonText}>Lägg till foto</AppText>
                                </Pressable>
                            </View>
                        </ScrollView>
                    </ImageBackground>
                </View>
            </View>
        </SafeAreaView>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: theme.background
    },

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

    titleWrapper: {
        textAlign: "center",
        justifyContent: "center",
    },

    bottom: {
        flex: 7,
        alignItems: "center",
        paddingHorizontal: 18,
    },

    tabs: {
        alignItems: "center",
    },

    paperStack: {
        width: "100%",
        alignItems: "center",
        position: "relative",
        marginTop: 12,
        maxWidth: 390,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: theme.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.borderLight,
        shadowColor: theme.shadow,
        shadowOpacity: 0.1,
        shadowRadius: 14,
        shadowOffset: {width: 0, height: 6},
        elevation: 4,
    },

    paper: {
        width: "100%",
        alignItems: "center",
        minHeight: 520,
    },

    paperImg: {
        resizeMode: "cover",
        opacity: 0.34,
    },

    fieldValue: {
        fontSize: 18,
        textAlign: "right",
    },

    content: {
        width: "100%",
        maxWidth: 330,
        paddingHorizontal: 16,
        paddingVertical: 22,
        paddingBottom: 30,
    },

    buttonContainer: {
        width: "100%",
        marginTop: 24,
        gap: 10,
    },

    stopsSection: {
        marginTop: 18,
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.borderLight,
        
    },

    stopButtonSection: {
        flexDirection: "row",
        width: "100%",
        marginTop: 12,
        gap: 10,
    },

    stopsHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },

    stopsText: {
        color: theme.textSecondary,
        lineHeight: 21,
    },

    stopsButton: {
        width: "47%",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: theme.accentSoft,
        borderWidth: 1,
        borderColor: theme.borderLight,
    },

    stopsButtonText: {
        color: theme.textPrimary,
        fontSize: 16,
    },

    addButton: {
        width: "100%",
        minHeight: 52,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: theme.accentSoft,
        borderWidth: 1,
        borderColor: theme.borderLight,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        shadowColor: theme.shadow,
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 3},
        elevation: 3,
    },

    addButtonSecond: {
        backgroundColor: theme.tape,
    },

    addButtonText: {
        fontSize: 20,
        paddingLeft: 10,
        color: theme.textPrimary,
    },

    addStopButton: {
        width: "47%",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 10,
        backgroundColor: theme.accentSoft,
        borderWidth: 1,
        borderColor: theme.borderLight,
    },
    buttonText: {fontSize: 18, color: theme.textPrimary},

    modeRow: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        justifyContent: "flex-end",
    },

    modeIcon: {
        width: 26,
        height: 26,
    },

    scrollContent: {
        paddingBottom: 40,
        paddingTop: 6,
    },

})
