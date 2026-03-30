import { useState } from 'react';
import { Alert, Button, Image, View, StyleSheet, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

type PickImageProps = {
    onImageSelected?: (uris: string[]) => void;
};

export default function PickImage({ onImageSelected }: PickImageProps) {
    const [images, setImages] = useState<string[]>([]);

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('permissionResult:', permissionResult);

        if (!permissionResult.granted) {
            if (!permissionResult.canAskAgain) {
                Alert.alert(
                    'Tillåtelse saknas',
                    'Appen har inte tillgång till bildbiblioteket. Gå till inställningar och tillåt åtkomst.',
                    [
                        { text: 'Avbryt', style: 'cancel' },
                        { text: 'Öppna inställningar', onPress: () => Linking.openSettings() }
                    ]
                );
            } else {
                Alert.alert(
                    'Tillåtelse krävs',
                    'Du behöver ge appen tillgång till bildbiblioteket för att välja en bild.'
                );
            }
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 1,
        });

        console.log('picker result:', result);

        if (!result.canceled) {
            const selectedUris = result.assets.map(asset => asset.uri);
            setImages(selectedUris);
            onImageSelected?.(selectedUris);
        }
    };

    return (
        <View style={styles.container}>
            <Button title="Välj en bild" onPress={pickImage} />
            <View style={styles.previewContainer}>
                {images.map((uri) => (
                    <Image key={uri} source={{ uri }} style={styles.image} />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
        justifyContent: 'center',
    },
    image: {
        width: 200,
        height: 200,
    },
});