import React, { useState } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { Image } from "expo-image";
import { router } from "expo-router";

const { width: screenWidth } = Dimensions.get("window");

const PHOTO_WIDTH = Math.min(screenWidth * 0.58, 220);
const PHOTO_HEIGHT = 220;
const POLAROID_H_PAD = 8;
const POLAROID_BOTTOM = 24;
const CARD_HEIGHT = PHOTO_HEIGHT + POLAROID_H_PAD + POLAROID_BOTTOM;

type Props = {
    images: string[];
    tripId: string;
};

export default function MemoryCarousel({ images, tripId }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) return null;

    return (
        <View style={styles.wrapper}>
            <Carousel
                width={screenWidth}
                height={CARD_HEIGHT}
                data={images}
                mode="parallax"
                modeConfig={{
                    parallaxScrollingScale: 0.84,
                    parallaxScrollingOffset: 44,
                }}
                loop={false}
                onSnapToItem={setCurrentIndex}
                renderItem={({ item, index }) => (
                    <Pressable
                        style={styles.slide}
                        onPress={() => router.push(`/trip-details/${tripId}/album?initialIndex=${index}`)}
                    >
                        <View style={styles.polaroid}>
                            <Image source={item} style={styles.photo} contentFit="cover" />
                        </View>
                    </Pressable>
                )}
            />

            {images.length > 1 && (
                <View style={styles.dotsRow}>
                    {images.map((_, i) => (
                        <View key={i} style={[styles.dot, i === currentIndex && styles.activeDot]} />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        alignItems: "center",
        paddingTop: 8,
    },
    slide: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    polaroid: {
        width: PHOTO_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: "#fff",
        paddingTop: POLAROID_H_PAD,
        paddingHorizontal: POLAROID_H_PAD,
        paddingBottom: POLAROID_BOTTOM,
        borderRadius: 4,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
    },
    photo: {
        flex: 1,
        borderRadius: 2,
    },
    dotsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 12,
        gap: 6,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 999,
        backgroundColor: "rgba(0,0,0,0.2)",
    },
    activeDot: {
        width: 18,
        backgroundColor: "rgba(0,0,0,0.55)",
    },
});
