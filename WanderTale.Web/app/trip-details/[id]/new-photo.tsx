import {useLocalSearchParams} from "expo-router";
import PickImage from "@/components/image-picker";
import {
    Alert,
    Button,
    ImageBackground,
    KeyboardAvoidingView,
    Platform, Pressable,
    ScrollView,
    StyleSheet, Text,
    View
} from "react-native";
import {AppText} from "@/components/app-text";
import {SafeAreaView} from "react-native-safe-area-context";
import React, {useState} from "react";
import {useMutation} from "@tanstack/react-query";
import {createPhoto} from "@/api/photo";
import DateInput from "@/components/date-input";
import {InlineLabelInput} from "@/components/inline-label-input";
import {CreatePhotoDto} from "@/dto/createPhotoDto";


type Props = {
    onSubmit: (dto: CreatePhotoDto) => void;
    isSaving?: boolean;
    errorMessage?: string;
};

export default function NewPhoto({ onSubmit, isSaving = false, errorMessage,}: Props) {   
    const {id} = useLocalSearchParams<{ id: string }>();
    const tripId = String(id);
    console.log("NewPhoto route id:", id);

    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
    const [photoDate, setPhotoDate] = useState<Date | null>(null);
    const [caption, setCaption] = useState("");
    const [entryId, setEntryId] = useState<string | null>(null);

    const createPhotoMutation = useMutation({
        mutationFn: (formData: FormData) => createPhoto(tripId, formData),
        onSuccess: (data) => {
            console.log("CREATE SUCCESS:", data);
            Alert.alert("Sparad", "Bilden har sparats.");
        },
        onError: (err) => {
            console.log("CREATE ERROR:", err);
            Alert.alert("Fel", "Kunde inte spara bilden.");
        },
    });

    const handleSavePhoto = () => {
        if (!selectedImageUri) {
            Alert.alert("Ingen bild vald", "Välj en bild först.");
            return;
        }

        const formData = new FormData();
        formData.append("caption", caption);

        if (photoDate) {
            formData.append("photoDate", photoDate.toISOString());
        }

        if (entryId) {
            formData.append("entryId", entryId);
        }

        formData.append("image", {
            uri: selectedImageUri,
            name: "photo.jpg",
            type: "image/jpeg",
        } as any);

        createPhotoMutation.mutate(formData);
    };

    return (
        <SafeAreaView style={{flex: 1}}>
            <ImageBackground source={require("@/assets/images/TheWorld.png")} style={{flex: 1}} resizeMode="cover">
                <View style={styles.headLine}>
                    <AppText size={30}>Foto</AppText>
                </View>
                <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <ScrollView
                        contentContainerStyle={{flexGrow: 1, paddingBottom: 32}}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="interactive"
                    >
                        <View style={styles.container}>
                            {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
                            <View style={styles.fields}>
                                <DateInput
                                    label="När:"
                                    value={photoDate}
                                    onChange={(date) => setPhotoDate(date)}
                                />

                                <InlineLabelInput
                                    label="Var: "
                                    value={caption}
                                    onChangeText={setCaption}
                                />
                            </View>

                            <PickImage onImageSelected={setSelectedImageUri} />

                                <Pressable
                                    style={styles.submitButton}
                                    disabled={createPhotoMutation.isPending || isSaving}
                                    onPress={handleSavePhoto}
                                >
                                    <AppText style={styles.submit}>
                                        {createPhotoMutation.isPending || isSaving
                                            ? "Sparar..."
                                            : "Spara"}
                                    </AppText>
                                </Pressable>

                            <View style={styles.footer}>
                                {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </ImageBackground>
        </SafeAreaView>

    );
}

const styles = StyleSheet.create({
    headLine: {
        paddingTop: 50,
        alignItems: "center",
    },
    keyboard: {flex: 1},
    saveButton: {
        marginTop: 24,
        paddingHorizontal: 24,
    },
    container: {
        flex: 1,
        padding: 50,
        gap: 20,
    },
    fields: {
        gap: 20,
    },
    footer: {
        marginTop: "auto",
        paddingTop: 16,
    },

    label: {
        marginTop: 10
    },

    input: {
        borderColor: "white",
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    textarea: {
        minHeight: 90,
        textAlignVertical: "top"
    },

    error: {
        color: "red",
        marginTop: 4
    },

    submit: {
        fontSize: 20,
        textAlignVertical: "center",
        alignSelf: "center"
    },

    submitButton: {
        alignSelf: "center",
        width: "100%",
        maxWidth: 350,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "#D5F7F4",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
    },
})