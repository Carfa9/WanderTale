import { ImageBackground, View, StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { createEntry } from "@/api/entries";
import { AppText } from "@/components/app-text";
import NewEntryForm from "@/components/new-entry-form";
import { useLocalSearchParams, router } from "expo-router";
import { CreateEntryDto } from "@/dto/createEntryDto";

export default function NewEntry() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const tripId = String(id);
    console.log("NewEntry route id:", id);

    const createEntryMutation = useMutation({
        mutationFn: (dto: CreateEntryDto) => {
            console.log("MUTATE tripId:", tripId);
            console.log("MUTATE dto:", dto);
            return createEntry(tripId, dto);
        },
        onSuccess: (data) => {
            console.log("CREATE SUCCESS:", data);
        },
        onError: (err) => {
            console.log("CREATE ERROR:", err);
        },
    });

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <ImageBackground source={require("@/assets/images/TheWorld.png")} style={{ flex: 1 }} resizeMode="cover">
                <View style={styles.headLine}>
                    <AppText size={30}>Anteckningar</AppText>
                </View>

                <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="interactive"
                    >
                        <NewEntryForm
                            onSubmit={(dto) => createEntryMutation.mutate(dto)}
                            isSaving={createEntryMutation.isPending}
                            errorMessage={createEntryMutation.isError ? "Kunde inte spara." : undefined}
                        />
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
})