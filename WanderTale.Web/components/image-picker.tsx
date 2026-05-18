import {useState} from "react";
import {Alert, Linking, Pressable, StyleSheet, View} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {Image} from "expo-image";
import {Ionicons} from "@expo/vector-icons";
import {AppText} from "@/components/app-text";
import {useTheme} from "@/context/ThemeContext";

type PickImageProps = {
    onImageSelected?: (uris: string[]) => void;
};

export default function PickImage({onImageSelected}: PickImageProps) {
    const [images, setImages] = useState<string[]>([]);
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            if (!permissionResult.canAskAgain) {
                Alert.alert(
                    "Tillåtelse saknas",
                    "Appen har inte tillgång till bildbiblioteket. Gå till inställningar och tillåt åtkomst.",
                    [
                        {text: "Avbryt", style: "cancel"},
                        {text: "Öppna inställningar", onPress: () => Linking.openSettings()},
                    ]
                );
            } else {
                Alert.alert(
                    "Tillåtelse krävs",
                    "Du behöver ge appen tillgång till bildbiblioteket för att välja en bild."
                );
            }
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsMultipleSelection: true,
            quality: 1,
        });

        if (!result.canceled) {
            const selectedUris = result.assets.map((asset) => asset.uri);
            setImages(selectedUris);
            onImageSelected?.(selectedUris);
        }
    };

    return (
        <View style={styles.container}>
            <Pressable style={styles.pickCard} onPress={pickImage}>
                <View style={styles.iconBadge}>
                    <Ionicons name="camera-outline" size={24} color={theme.tokens.accentDark}/>
                </View>
                <AppText size={22} style={styles.pickTitle}>
                    {images.length ? "Byt eller lägg till bilder" : "Välj bilder"}
                </AppText>
                <AppText style={styles.pickHint}>
                    {images.length
                        ? `${images.length} ${images.length === 1 ? "bild vald" : "bilder valda"}`
                        : "Plocka minnen från bildbiblioteket"}
                </AppText>
            </Pressable>

            {images.length > 0 && (
                <View style={styles.previewContainer}>
                    {images.slice(0, 6).map((uri, index) => (
                        <View
                            key={uri}
                            style={[
                                styles.polaroid,
                                index % 2 === 0 ? styles.polaroidTiltLeft : styles.polaroidTiltRight,
                            ]}
                        >
                            <Image source={{uri}} style={styles.image} contentFit="cover"/>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    container: {
        alignItems: "center",
        gap: 14,
    },
    pickCard: {
        width: "100%",
        minHeight: 132,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
        paddingVertical: 20,
        borderRadius: 14,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.borderLight,
        shadowColor: theme.shadow,
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: {width: 0, height: 5},
        elevation: 3,
    },
    iconBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
        backgroundColor: theme.surfaceAlt,
        borderWidth: 1,
        borderColor: theme.borderLight,
    },
    pickTitle: {
        color: theme.textPrimary,
        textAlign: "center",
    },
    pickHint: {
        marginTop: 2,
        fontFamily: "Nunito_600SemiBold",
        fontSize: 13,
        lineHeight: 18,
        color: theme.textSecondary,
        textAlign: "center",
    },
    previewContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        justifyContent: "center",
    },
    polaroid: {
        width: 82,
        height: 96,
        padding: 5,
        paddingBottom: 16,
        borderRadius: 4,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.borderLight,
        shadowColor: theme.shadow,
        shadowOpacity: 0.14,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 4},
        elevation: 3,
    },
    polaroidTiltLeft: {
        transform: [{rotate: "-2deg"}],
    },
    polaroidTiltRight: {
        transform: [{rotate: "2deg"}],
    },
    image: {
        flex: 1,
        borderRadius: 3,
    },
});
