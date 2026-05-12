import React from "react";
import {Modal, Pressable, StyleSheet, View} from "react-native";
import {AppText} from "@/components/app-text";
import { Image } from "expo-image";
import {TravelModeKey} from "@/types/travelMode";
import {transportOptionList} from "@/components/transport-options";
import {useTheme} from "@/context/ThemeContext";

type Props = {
    visible: boolean;
    value: TravelModeKey[];
    onClose: () => void;
    onDone?: () => void;
    onSelect: (key: TravelModeKey) => void;
};

export default function TravelModePickerModal({visible, value, onClose, onSelect}: Props) {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
            </Pressable>

            <View style={styles.sheet}>
                <AppText style={styles.title}>Färdsätt:</AppText>
                <View style={styles.row}>
                    {transportOptionList.map((option) => {
                        const selected = value.includes(option.key);
                        return (
                            <Pressable
                                key={option.key}
                                onPress={() => onSelect(option.key)}
                                style={[styles.card, selected && styles.cardSelected]}
                            >
                                <Image source={option.image} style={styles.icon} contentFit="contain" tintColor={theme.tokens.textPrimary}/>
                                <AppText>{option.label}</AppText>
                            </Pressable>
                        );
                    })}
                </View>
                
                <Pressable onPress={onClose} style={styles.closeButton}>
                    <AppText>Stäng</AppText>
                </Pressable>
            </View>
        </Modal>
    )

}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: theme.shadow,
    },
    sheet: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.surface,
        padding: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    title: {
        fontSize: 16, 
        marginBottom: 12},
    row: {
        flexDirection: "row", flexWrap: "wrap", gap: 12
    },
    icon: {width: 40, height: 40, marginBottom: 6},
    closeButton: {
        marginTop: 12,
        alignSelf: "flex-end",
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    card: {
        width: 100,
        height: 100,
        borderRadius: 10,
        backgroundColor: theme.background,
        alignItems: "center",
        justifyContent: "center",
        padding: 10,
    },
    cardSelected: {
        borderWidth: 2,
        borderColor: theme.textPrimary,
    },

});
  
