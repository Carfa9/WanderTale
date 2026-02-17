import {ImageBackground, View, StyleSheet,} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createEntry} from "@/api/entries";
import {AppText} from "@/components/app-text";


export default function NewEntry() {

    const queryClient = useQueryClient();
    
    const createEntryMutation = useMutation({
        mutationFn: createEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["entries"]});
        },
    });
    return (
        <SafeAreaView style={{flex: 1}}>
            <ImageBackground source={require("@/assets/images/TheWorld.png")}
                             style={{flex: 1}}
                             resizeMode="cover">
                <View style={styles.headLine}>
                    <AppText size={30}>Anteckningar</AppText>
                </View>
            </ImageBackground>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create ({
    headLine: {
        paddingTop: 50,
        alignItems: "center",
    }
})