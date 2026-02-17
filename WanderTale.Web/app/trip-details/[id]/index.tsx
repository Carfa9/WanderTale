import {View, StyleSheet, Pressable, ImageBackground, ScrollView} from "react-native";
import {AppText} from "@/components/app-text";
import {useQuery} from "@tanstack/react-query";
import {router, useLocalSearchParams} from "expo-router";
import {getTripById} from "@/api/trips";
import {SafeAreaView} from "react-native-safe-area-context";
import FieldCard from "@/components/field-card";
import {FormatDate} from "@/components/format-date";
import {TravelModeKey} from "@/types/travelMode";
import {transportOptionsByKey} from "@/components/transport-options";
import {Image} from "expo-image";
import {ExpandableText} from "@/components/expandable-text";


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

function toModeArray(travelMode: unknown): TravelModeKey[] {
    if (!travelMode) return [];
    if (Array.isArray(travelMode)) return travelMode as TravelModeKey[];
    if (typeof travelMode === "string") {
        return travelMode
            .split(",")
            .map(s => s.trim())
            .filter(Boolean) as TravelModeKey[];
    }
    return [];
}

export default function TripDetails() {

    const {id} = useLocalSearchParams<{ id: string | string[] }>();

    const {data: trip, isLoading, error} = useQuery({
        queryKey: ["trip", id],
        queryFn: () => getTripById(String(id)),
        enabled: !!id,
    });

    if (isLoading) return <FullScreenMessage>Laddar…</FullScreenMessage>;
    if (error) return <FullScreenMessage>Något gick fel.</FullScreenMessage>;
    if (!trip) return <FullScreenMessage>Hittar inte resan.</FullScreenMessage>;

    const descriptionText = trip.description?.trim() || "Inget här än..";

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.top}>
                <AppText size={30}>{trip?.title ?? "Namnlös resa"}</AppText>
            </View>

            <View style={styles.bottom}>
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

                            <View style={styles.buttonContainer}>
                                <Pressable style={styles.addButton} onPress={() => router.push(`/trip-details/${id}/entries/new-entry`)
                                }>
                                    <AppText style={styles.addButtonText}>Lägg till anteckning</AppText>
                                </Pressable>
                                <Pressable style={[styles.addButton, styles.addButtonSecond]}>
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

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F5EDE4"
    },

    top: {
        flex: 1, alignItems: "center",
        justifyContent: "center",
        borderBottomWidth: 15,
        borderBottomColor: "#C0C0C0"
    },

    bottom: {
        flex: 7,
        alignItems: "center",
        paddingHorizontal: 30,
    },

    paperStack: {
        width: "100%",
        alignItems: "center",
        position: "relative",
    },

    paper: {
        width: "100%",
        alignItems: "center",
        paddingVertical: 20,
    },

    paperImg: {
        resizeMode: "cover",
    },


    fieldValue: {
        fontSize: 18,
        textAlign: "right",
    },

    content: {
        width: "100%",
        maxWidth: 250,
        paddingHorizontal: 0,
        paddingVertical: 20,
        borderRadius: 18,
        paddingBottom: 30,
    },

    buttonContainer: {
        width: "100%",
        marginTop: 30,
    },

    addButton: {
        width: "100%",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: "#D5F7F4",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
        justifyContent: "center",
        alignItems: "flex-start",
    },

    addButtonSecond: {
        marginTop: 12,
    },

    addButtonText: {
        fontSize: 20,
        paddingHorizontal: 30,
    },

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
