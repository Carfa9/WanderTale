import React from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import { Extrapolation, interpolate } from "react-native-reanimated";
import Carousel from "react-native-reanimated-carousel";
import { Image } from "expo-image";
import { router } from "expo-router";
import {useTheme} from "@/context/ThemeContext";

const { width: screenWidth } = Dimensions.get("window");

const PHOTO_WIDTH = Math.min(screenWidth * 0.58, 232);
const PHOTO_HEIGHT = 232;
const POLAROID_H_PAD = 9;
const POLAROID_BOTTOM = 30;
const CARD_HEIGHT = PHOTO_HEIGHT + POLAROID_H_PAD + POLAROID_BOTTOM;
const SIDE_OFFSET = Math.min(screenWidth * 0.27, 112);

type Props = {
    images: string[];
    tripId: string;
    onPhotoPress?: (index: number) => void;
};

export default function MemoryCarousel({ images, tripId, onPhotoPress }: Props) {
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);

    if (!images || images.length === 0) return null;

    return (
        <View style={styles.wrapper}>
            <Carousel
                style={styles.carousel}
                width={screenWidth}
                height={CARD_HEIGHT + 18}
                data={images}
                windowSize={3}
                customAnimation={(value) => {
                    "worklet";

                    const distance = Math.abs(value);
                    const clamped = Math.max(-1, Math.min(1, value));
                    const side = clamped < 0 ? -1 : 1;

                    const translateX = interpolate(
                        value,
                        [-1, 0, 1],
                        [-SIDE_OFFSET, 0, SIDE_OFFSET],
                        Extrapolation.CLAMP
                    );
                    const translateY = interpolate(distance, [0, 1], [0, 18], Extrapolation.CLAMP);
                    const scale = interpolate(distance, [0, 1], [1, 0.68], Extrapolation.CLAMP);
                    const opacity = interpolate(distance, [0, 1, 1.45], [1, 0.72, 0], Extrapolation.CLAMP);
                    const rotate = interpolate(distance, [0, 1], [0, 7], Extrapolation.CLAMP);

                    return {
                        opacity,
                        zIndex: Math.round(100 - distance * 10),
                        transform: [
                            { translateX },
                            { translateY },
                            { scale },
                            { rotateZ: `${side * rotate}deg` },
                        ],
                    };
                }}
                loop={false}
                renderItem={({ item, index }) => (
                    <Pressable
                        style={styles.slide}
                        onPress={() =>
                            onPhotoPress
                                ? onPhotoPress(index)
                                : router.push(`/trip-details/${tripId}/album?initialIndex=${index}`)
                        }
                    >
                        <View style={styles.polaroid}>
                            <Image source={item} style={styles.photo} contentFit="cover" />
                            <View style={styles.captionLine} />
                        </View>
                    </Pressable>
                )}
            />
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    wrapper: {
        width: "100%",
        alignItems: "center",
        paddingTop: 10,
        paddingBottom: 6,
    },
    eyebrow: {
        alignSelf: "flex-start",
        marginLeft: 26,
        marginBottom: 2,
        color: theme.textSecondary,
    },
    carousel: {
        width: screenWidth,
        overflow: "visible",
    },
    slide: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    polaroid: {
        width: PHOTO_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: theme.surface,
        paddingTop: POLAROID_H_PAD,
        paddingHorizontal: POLAROID_H_PAD,
        paddingBottom: POLAROID_BOTTOM,
        borderRadius: 4,
        shadowColor: theme.shadow,
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 5,
    },
    photo: {
        flex: 1,
        borderRadius: 2,
    },
    captionLine: {
        width: "42%",
        height: 1,
        alignSelf: "center",
        marginTop: 14,
        backgroundColor: theme.borderLight,
    },
});
