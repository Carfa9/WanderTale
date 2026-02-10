import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import NewTripForm from "@/components/new-trip-form";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createTrip} from "@/api/trips";
import {AppText} from "@/components/app-text";


export default function PlanTrip() {
    const queryClient = useQueryClient();
    
    const createTripMutation = useMutation({
        mutationFn: createTrip,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trips"] });
        },
    });
    return (
        <SafeAreaView style={styles.screen}>
            <KeyboardAvoidingView
                style={styles.keyboard}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={0}>
                <View style={styles.top}>
                <AppText size={30}>Planera resa</AppText>
                </View>
                <ScrollView
                    contentContainerStyle={{paddingBottom: 32}}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive">

                    <View style={styles.bottom}>
                        <NewTripForm/>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    keyboard: {flex: 1},    
    screen: {flex: 1, backgroundColor: "#F5EDE4"},

    top: {
        flex: 3, alignItems: "center",
        justifyContent: "center",
        borderBottomWidth: 15,
        borderBottomColor: "#C0C0C0"
    },
    bottom: {
        flex: 4
    },
})
