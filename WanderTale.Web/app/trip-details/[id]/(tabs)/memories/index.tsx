import {View, ImageBackground, ScrollView, StyleSheet} from "react-native";
import TripSectionTabs from "@/components/trip-section-tabs";
import {useLocalSearchParams} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {getTripById} from "@/api/trips";
import {SafeAreaView} from "react-native-safe-area-context";
import {AppText} from "@/components/app-text";
import MemoryCarousel from "@/components/image-carousel";

export default function MemoriesScreen() {
    const {id} = useLocalSearchParams<{ id: string | string[] }>();
    const tripId = Array.isArray(id) ? id[0] : id;

    const {data: trip, isLoading, error} = useQuery({
        queryKey: ["trip", tripId],
        queryFn: () => getTripById(String(tripId)),
        enabled: !!tripId,
    });

    type Props = {
        images: any[];
    };

    const images = [
        require("@/assets/images/bike.png"),
        require("@/assets/images/train.png"),
        require("@/assets/images/Plane.png"),
    ];   

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
                            <MemoryCarousel
                                images={images}
                            />
                           
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
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingTop: 10,
        paddingBottom: 10,
        borderBottomWidth: 15,
        borderBottomColor: "#C0C0C0",
    },

    titleWrapper: {
        textAlign: "center",
        justifyContent: "center",
    },

    bottom: {
        flex: 7,
        alignItems: "center",
        paddingHorizontal: 30,
    },

    tabs: {
        alignItems: "center",
    },

    paperStack: {
        width: "100%",
        alignItems: "center",
        position: "relative",
        marginTop: 15,
    },

    paper: {
        width: "100%",
        alignItems: "center",
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
