import {StyleSheet, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import NewTripForm from "@/components/newTripForm";

export default function PlanTrip() {
    return(
        <SafeAreaView style={styles.screen}>
            <View style={styles.top}/>            
            
            <View style={styles.bottom}>
            <NewTripForm/>
        </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: "#F5EDE4"},

    top: {
        flex: 1, alignItems: "center",
        justifyContent: "center",
        borderBottomWidth: 15,
        borderBottomColor: "#C0C0C0",
    },

    bottom: {
        flex: 4
    },
})
