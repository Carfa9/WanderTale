import {Pressable, View, StyleSheet} from "react-native";
import {AppText} from "@/components/app-text";
import {Ionicons} from "@expo/vector-icons";
import {Image} from "expo-image";
import React from "react";
import {TravelModeKey} from "@/types/travelMode";
import {transportOptionList} from "@/components/transport-options";


type Props = {
    label: string;
    value?: TravelModeKey[];
    placeholder?: string;
    onPress: () => void;
};

export function InlineLabelSelect({label, value = [], placeholder, onPress}: Props) {
    return (
        <Pressable onPress={onPress}>
            <View style={styles.wrapper}>
                <AppText style={styles.inlineLabel}>{label}</AppText>
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
                                    />
                                );
                            })}
                        </View>
                    )}
                </View>
                <Ionicons name="chevron-down" size={18} color="#9aa0a6"/>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#d9d9d9",
        borderRadius: 4,
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    inlineLabel: {
        marginRight: 10,
        fontSize: 18,
        paddingTop: 2,
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