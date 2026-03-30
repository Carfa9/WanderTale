import {View, ImageBackground, ScrollView, StyleSheet} from "react-native";
import TripSectionTabs from "@/components/trip-section-tabs";
import {useLocalSearchParams} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {getTripById} from "@/api/trips";
import {SafeAreaView} from "react-native-safe-area-context";
import {AppText} from "@/components/app-text";
import MemoryCarousel from "@/components/image-carousel";
import {api_url} from "@/api/config";
import {getPhotos} from "@/api/photo";


export default function MemoriesScreen() {
    const {id} = useLocalSearchParams<{ id: string | string[] }>();
    const tripId = Array.isArray(id) ? id[0] : id;

    const {data: trip, isLoading, error} = useQuery({
        queryKey: ["trip", tripId],
        queryFn: () => getTripById(String(tripId)),
        enabled: !!tripId,
    });
    console.log("tripId in MemoriesScreen:", tripId);
    const {data: photos = []} = useQuery({
        queryKey: ["photos", tripId],
        queryFn: () => getPhotos(tripId),
        enabled: !!tripId,
    });

    const images = photos.map((photo) => `${api_url}${photo.imageUri}`);


    console.log("photos:", photos);
    console.log("images:", images);

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

                <ImageBackground
                    source={require("@/assets/images/TheWorld.png")}
                    imageStyle={styles.paperImg}
                    style={{flex: 1}}
                >
                    <View style={styles.tabsWrapper}>
                        <TripSectionTabs tripId={tripId}/>
                    </View>

                    <ScrollView style={styles.content}
                                showsVerticalScrollIndicator={false}
                                overScrollMode="never"
                                contentContainerStyle={styles.scrollContent}>
                        <View style={{width: "100%", maxWidth: 340, alignSelf: "center"}}>
                            <MemoryCarousel images={images}/>
                        </View>

                    </ScrollView>
                </ImageBackground>

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
        alignItems: "stretch",
    },

    tabsWrapper: {
        alignItems: "center",
        position: "absolute",
        top: 0,
        width: "100%",
        zIndex: 10,
    },

    paperImg: {
        opacity: 0.6,
    },

    fieldValue: {
        fontSize: 18,
        textAlign: "right",
    },

    content: {
        width: "100%",
        marginTop: 60,
    },

    carouselContent: {
        width: "100%",
        maxWidth: 340,
        alignSelf: "center",
        paddingHorizontal: 0,
        paddingVertical: 20,
        borderRadius: 18,
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

    scrollContent: {
        paddingBottom: 40,
        paddingTop: 6,
    },

})
