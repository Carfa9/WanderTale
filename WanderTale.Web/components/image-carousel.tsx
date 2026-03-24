import React from "react";
import { Dimensions, View, StyleSheet } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { Image } from "expo-image";

type Props = {
    images: string[];
};

const { width } = Dimensions.get("window");

export default function MemoryCarousel({ images }: Props) {
    if (!images || images.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Carousel
                loop={false}
                width={width - 32}
                height={220}
                data={images}
                scrollAnimationDuration={800}
                renderItem={({ item }) => (
                    <View style={styles.slide}>
                        <Image
                            source={item}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                        />
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
    },
    slide: {
        flex: 1,
        borderRadius: 16,
        overflow: "hidden",
    },
    image: {
        width: "100%",
        height: "100%",
    },
});