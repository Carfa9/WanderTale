import React from "react";
import {Keyboard, Pressable, StyleSheet, Text, View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {Image} from "expo-image";
import {AppText} from "@/components/app-text";
import {transportOptionList} from "@/components/transport-options";
import {TravelModeKey} from "@/types/travelMode";
import {useTheme} from "@/context/ThemeContext";

type Props = {
    label: string;
    value?: TravelModeKey[];
    placeholder?: string;
    onPress: () => void;
};

export function InlineLabelSelect({label, value = [], onPress}: Props) {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);

    return (
        <Pressable
            onPress={() => {
                Keyboard.dismiss();
                onPress();
            }}
        >
            <View style={styles.wrapper}>
                <Text style={styles.inlineLabel}>{label}</Text>
                <View style={styles.valueArea}>
                    {value.length === 0 ? (
                        <AppText style={styles.placeholder}></AppText>
                    ) : (
                        <View style={styles.icons}>
                            {value.map((key) => {
                                const opt = transportOptionList.find((o) => o.key === key);
                                if (!opt) return null;

                                return (
                                    <Image
                                        key={key}
                                        source={opt.image}
                                        style={styles.icon}
                                        contentFit="contain"
                                        tintColor={theme.tokens.textPrimary}
                                    />
                                );
                            })}
                        </View>
                    )}
                </View>
                <Ionicons name="chevron-down" size={18} color={theme.tokens.textMuted}/>
            </View>
        </Pressable>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    wrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.surface,
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 10,
        boxShadow: `0px 0px 10px ${theme.shadow}`,
    },
    inlineLabel: {
        marginRight: 10,
        fontSize: 18,
        paddingTop: 2,
        color: theme.textPrimary,
    },
    valueArea: {
        flex: 1,
        alignItems: "center",
    },
    valueText: {
        fontSize: 18,
    },
    placeholder: {
        opacity: 0.55,
    },
    icons: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    icon: {
        width: 32,
        height: 32,
    },
});
