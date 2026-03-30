import {router, useLocalSearchParams} from "expo-router";
import PickImage from "@/components/image-picker";
import {
    Alert,
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
import {useMutation, useQueryClient} from "@tanstack/react-query";
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

    const [selectedImageUris, setSelectedImageUris] = useState<string[]>([]);
    const [photoDate, setPhotoDate] = useState<Date | null>(null);
    const [caption, setCaption] = useState("");
    const [entryId, setEntryId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const createPhotoMutation = useMutation({
        mutationFn: (formData: FormData) => createPhoto(tripId, formData),
        onSuccess: async (data) => {
            await queryClient.invalidateQueries({queryKey: ["trip", tripId]});
            console.log("CREATE SUCCESS:", data);
        },
        onError: (err) => {
            console.log("CREATE ERROR full:", JSON.stringify(err, null, 2));
            console.log("CREATE ERROR raw:", err);
            Alert.alert("Fel", "Kunde inte spara bilden.");
        },
    });

    const handleSavePhoto = async () => {
        if (selectedImageUris.length === 0) {
            Alert.alert("Ingen bild vald", "Välj en bild först.");
            return;
        }

        try {
            for (const uri of selectedImageUris) {
                const formData = new FormData();
                formData.append("caption", caption);

                if (photoDate) {
                    formData.append("photoDate", photoDate.toISOString());
                }

                if (entryId) {
                    formData.append("entryId", entryId);
                }

                const fileName = uri.split("/").pop() ?? "photo.jpg";

                formData.append("image", {
                    uri,
                    name: fileName,
                    type: "image/jpeg",
                } as any);

                console.log("Uploading image:", uri);

                await createPhotoMutation.mutateAsync(formData);
            }
            router.replace(`/trip-details/${tripId}/memories`);
        } catch (error) {
            console.log("SAVE ERROR:", error);
            Alert.alert("Fel", "Kunde inte spara bilden.");
        }
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

                            <PickImage onImageSelected={setSelectedImageUris} />

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