import {router, usePathname} from "expo-router";
import {Pressable, StyleSheet, View} from "react-native";
import {AppText} from "@/components/app-text";
import {useTheme} from "@/context/ThemeContext";

type Props = {
    tripId: string;
};

export default function TripSectionTabs({ tripId }: Props) {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);
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
                <AppText>Resan</AppText>
            </Pressable>

            <Pressable
                onPress={() => router.replace(`/trip-details/${tripId}/memories`)}
                style={[
                    styles.tab,
                    isMemories ? styles.activeTab : styles.inactiveTab,
                ]}
            >
                <AppText>Minnen</AppText>
            </Pressable>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    wrapper: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 0,
        paddingHorizontal: 16,
        gap: 6,
    },
    tab: {
        minWidth: 120,
        paddingHorizontal: 18,
        borderTopLeftRadius: 5,
        borderTopRightRadius: 5,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        alignItems: "center",
        justifyContent: "center",
    },
    activeTab: {
        height: 50,
        backgroundColor: theme.surface,
        shadowColor: theme.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    inactiveTab: {
        height: 42,
        opacity: 0.9,
        backgroundColor: theme.surfaceAlt,
    },
});
