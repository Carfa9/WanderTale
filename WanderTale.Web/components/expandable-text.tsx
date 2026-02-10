import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/app-text";
import { Ionicons } from "@expo/vector-icons";

type Props = {
    text: string;
    collapsedLines?: number;
    align?: "left" | "right";
};

export function ExpandableText({ text, collapsedLines = 3, align = "left" }: Props) {
    const [expanded, setExpanded] = React.useState(false);
    const [isClipped, setIsClipped] = React.useState(false);

    const isRight = align === "right";

    return (
        <View style={styles.wrap}>
            <AppText
                style={[styles.text, isRight && styles.textRight]}
                numberOfLines={expanded ? undefined : collapsedLines}
                onTextLayout={(e) => {
                    if (!expanded)
                        setIsClipped(e.nativeEvent.lines.length > collapsedLines);
                }}
            >
                {text}
            </AppText>

            {isClipped && (
            <Pressable
                onPress={() => setExpanded((v) => !v)}
                hitSlop={10}
                style={styles.fab}
            >
                <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={22}
                />
            </Pressable>
                )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: "100%",
        position: "relative",
    },

    text: {
        textAlign: "left",
        lineHeight: 20,
        paddingRight: 18,
    },

    textRight: {
        textAlign: "right",
    },

    fab: {
        position: "absolute",
        right: 0,
        bottom: 0,
        paddingLeft: 6,
    },
});
