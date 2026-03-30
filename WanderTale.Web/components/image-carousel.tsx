import React, {useMemo, useRef, useState} from "react";
import {Dimensions, View, StyleSheet, Pressable} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { Image } from "expo-image";

const { width: screenWidth } = Dimensions.get("window");

type Props = {
    images: any[];
};

export default function MemoryCarousel({ images }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const carouselRef = useRef<any>(null);

    const safeImages = useMemo(() => images ?? [], [images]);

    if (safeImages.length === 0) {
        return null;
    }

    const prevImage = currentIndex > 0 ? safeImages[currentIndex - 1] : null;
    const nextImage =
        currentIndex < safeImages.length - 1 ? safeImages[currentIndex + 1] : null;

    const goToIndex = (newIndex: number) => {
        if (newIndex < 0 || newIndex >= safeImages.length) return;

        setCurrentIndex(newIndex);
        carouselRef.current?.scrollTo({
            index: newIndex,
            animated: true,
        });
    };

    return (
        <View style={styles.wrapper}>
            <View style={styles.row}>
                <View style={styles.sideSlot}>
                    {prevImage ? (
                        <Pressable onPress={() => goToIndex(currentIndex - 1)}>
                            <Image
                                source={prevImage}
                                style={[styles.sideImage, styles.leftImage]}
                                contentFit="cover"
                            />
                        </Pressable>
                    ) : (
                        <View style={styles.emptySide} />
                    )}
                </View>

                <View style={styles.centerSlot}>
                    <Carousel
                        ref={carouselRef}
                        width={CENTER_WIDTH}
                        height={CENTER_HEIGHT}
                        data={safeImages}
                        loop={false}
                        pagingEnabled
                        snapEnabled
                        defaultIndex={0}
                        onSnapToItem={(index) => setCurrentIndex(index)}
                        renderItem={({ item }) => (
                            <View style={styles.mainSlide}>
                                <View style={styles.polaroid}>
                                <Image
                                    source={item}
                                    style={styles.mainImage}
                                    contentFit="cover"
                                />
                                </View>
                            </View>
                        )}
                    />
                </View>

                <View style={styles.sideSlot}>
                    {nextImage ? (
                        <Pressable onPress={() => goToIndex(currentIndex + 1)}>
                            <Image
                                source={nextImage}
                                style={[styles.sideImage, styles.rightImage]}
                                contentFit="cover"
                            />
                        </Pressable>
                    ) : (
                        <View style={styles.emptySide} />
                    )}
                </View>
            </View>

            <View style={styles.dotsRow}>
                {safeImages.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            index === currentIndex && styles.activeDot,
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const CENTER_WIDTH = Math.min(screenWidth * 0.62, 240);
const CENTER_HEIGHT = 250;
const SIDE_WIDTH = 48;
const SIDE_HEIGHT = 82;

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        alignItems: "center",
        paddingTop: 8,
    },

    row: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },

    sideSlot: {
        width: SIDE_WIDTH,
        alignItems: "center",
        justifyContent: "center",
    },

    centerSlot: {
        width: CENTER_WIDTH,
        alignItems: "center",
        justifyContent: "center",
    },

    carousel: {
        width: CENTER_WIDTH,
        height: CENTER_HEIGHT,
    },

    mainSlide: {
        width: "100%",
        height: "100%",
        borderRadius: 18,
        backgroundColor: "transparent",
    },

    polaroid: {
        backgroundColor: "#fff",
        paddingTop: 8,
        paddingHorizontal: 8,
        paddingBottom: 18,
        borderRadius: 6,

        // shadow (iOS)
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },

        // shadow (Android)
        elevation: 4,
    },

    mainImage: {
        width: "100%",
        height: "100%",
        borderRadius: 6,
    },

    sideImage: {
        width: SIDE_WIDTH,
        height: SIDE_HEIGHT,
        borderRadius: 12,
        opacity: 0.82,
    },

    leftImage: {
        transform: [{ scale: 0.96 }],
    },

    rightImage: {
        transform: [{ scale: 0.96 }],
    },

    emptySide: {
        width: SIDE_WIDTH,
        height: SIDE_HEIGHT,
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