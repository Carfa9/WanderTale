import {Pressable, View, StyleSheet} from "react-native";
import {AppText} from "@/components/app-text";
import {Ionicons} from "@expo/vector-icons";
import { Image } from "expo-image";
import {transportOptions, TravelModeKey} from "@/data/transport-options";
import React from "react";

type Props = {
    label: string;
    value?: TravelModeKey;
    placeholder?: string;
    onPress: () => void;
};

export function InlineLabelSelect({ label, value, placeholder, onPress }: Props) {
    const selectedOption = transportOptions.find(o => o.key === value);
    return (
        <Pressable onPress={onPress}>
            <View style={styles.wrapper}>
                <AppText style={styles.inlineLabel}>{label}</AppText>
                <View style={styles.valueArea}>
                    {selectedOption ? (
                        <Image
                            source={selectedOption.image}
                            style={styles.icon}
                            contentFit="contain"
                        />
                    ) : (
                        <AppText style={styles.placeholder}>
                        </AppText>
                    )}
                </View>

                <Ionicons name="chevron-down" size={18} color="#9aa0a6" />
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
    icon: {  width: 32,
        height: 32, },

                    });