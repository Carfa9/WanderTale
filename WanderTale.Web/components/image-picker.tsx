import { useState } from 'react';
import { Alert, Button, Image, View, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

type PickImageProps = {
    onImageSelected?: (uri: string) => void;
}

export default function PickImage({ onImageSelected }: PickImageProps) {
    const [image, setImage] = useState<string | null>(null);

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert('Tillåtelse krävs', 'Tillåtelse för tillträdelse i bildbibliotek krävs.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        console.log(result);

        if (!result.canceled) {
            const selectedUri = result.assets[0].uri;
            setImage(selectedUri);
            onImageSelected?.(selectedUri);
        }
    };

    return (
        <View style={styles.container}>
            <Button title="Välj en bild." onPress={pickImage} />
            {image && <Image source={{ uri: image }} style={styles.image} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: 200,
        height: 200,
    },
});
