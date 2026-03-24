import React from "react";
import {Pressable, StyleSheet, View} from "react-native";
import {AppText} from "@/components/app-text";
import {Ionicons} from "@expo/vector-icons";

type Props = {
    text: string;
    collapsedLines?: number;
    textStyle?: any;
};

export function ExpandableText({text, collapsedLines = 3, textStyle}: Props) {
    const [expanded, setExpanded] = React.useState(false);
    const [isClipped, setIsClipped] = React.useState(false);

    return (
        <View style={styles.host}>
            <AppText
                style={[styles.measureText, textStyle]}
                onTextLayout={(e) => {
                    const fullLineCount = e.nativeEvent.lines.length;
                    setIsClipped(fullLineCount > collapsedLines);
                }}
            >
                {text}
            </AppText>

            <AppText
                style={[styles.text, textStyle]}
                numberOfLines={expanded ? undefined : collapsedLines}
            >
                {text}
            </AppText>

            {(isClipped || expanded) && (
                <Pressable
                    onPress={() => setExpanded((v) => !v)}
                    hitSlop={12}
                    style={styles.chevron}
                >
                    <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18}/>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    host: {
        position: "relative",
        width: "100%",
        alignSelf: "stretch",
    },
    text: {
        paddingRight: 22,
    },
    measureText: {
        position: "absolute",
        opacity: 0,
        pointerEvents: "none",
        left: 0,
        right: 0,
    },
    chevron: {
        position: "absolute",
        right: 0,
        bottom: 0,
        zIndex: 10,
        elevation: 10, // Android
    },
});
