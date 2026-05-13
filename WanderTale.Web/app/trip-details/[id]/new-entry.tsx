import { ImageBackground, View, StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEntry } from "@/api/entries";
import { AppText } from "@/components/app-text";
import NewEntryForm from "@/components/new-entry-form";
import { useLocalSearchParams, router } from "expo-router";
import { CreateEntryDto } from "@/dto/createEntryDto";
import {useTheme} from "@/context/ThemeContext";
import {Entry} from "@/types/entry";

export default function NewEntry() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const tripId = String(id);
    const queryClient = useQueryClient();
    const {theme} = useTheme();
    const styles = createStyles(theme.tokens);

    const createEntryMutation = useMutation({
        mutationFn: (dto: CreateEntryDto) => createEntry(tripId, dto),
        onSuccess: (createdEntry) => {
            queryClient.setQueryData<Entry[]>(["entries", tripId], (current = []) => {
                const withoutDuplicate = current.filter((entry) => entry.id !== createdEntry.id);
                return [createdEntry, ...withoutDuplicate];
            });

            router.back();
            queryClient.invalidateQueries({ queryKey: ["entries", tripId] });
        },
        onError: (err) => {
            console.log("CREATE ERROR:", err);
        },
    });

    return (
        <SafeAreaView style={styles.screen}>
            <ImageBackground
                source={require("@/assets/images/TheWorld.png")}
                style={styles.background}
                imageStyle={styles.backgroundImage}
                resizeMode="cover"
            >
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


const createStyles = (theme: ReturnType<typeof useTheme>["theme"]["tokens"]) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: theme.background,
    },
    background: {
        flex: 1,
        backgroundColor: theme.surfaceAlt,
    },
    backgroundImage: {
        opacity: theme.isDark ? 0.18 : 0.62,
    },
    headLine: {
        paddingTop: 50,
        alignItems: "center",
    },
    keyboard: {flex: 1},
})
