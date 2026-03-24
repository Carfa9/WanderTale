import {router, usePathname} from "expo-router";
import {Pressable, View, StyleSheet, Text} from "react-native";
import {AppText} from "@/components/app-text";

type Props = {
    tripId: string;
};

export default function TripSectionTabs({ tripId }: Props) {
    const pathname = usePathname();
    
    const isDetails = pathname === `/trip-details/${tripId}`;
    const isMemories = pathname === `/trip-details/${tripId}/memories`;
    
    return (
        <View style={styles.wrapper}>
            <Pressable
                onPress={() => router.replace(`/trip-details/${tripId}`)}
                style={[
                    styles.tab,
                    isDetails ? styles.activeTab : styles.inactiveTab,
                ]}
            >
                <AppText >Resan</AppText>
            </Pressable>

            <Pressable
                onPress={() => router.replace(`/trip-details/${tripId}/memories`)}
                style={[
                    styles.tab,
                    isMemories ? styles.activeTab : styles.inactiveTab,
                ]}
            >
                <AppText >Minnen
                </AppText>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 0,
        paddingHorizontal: 16,
        gap: 8,
    },
    tab: {
        minWidth: 120,
        paddingHorizontal: 18,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
        borderWidth: 1,
        borderColor: "#d8cfbf",
        alignItems: "center",
        justifyContent: "center",
    },
    activeTab: {
        height: 52,
        backgroundColor: "#faf4e8",
    },
    inactiveTab: {
        height: 44,
        opacity: 0.92,
        backgroundColor: "#e7dfd1",
    },
});
