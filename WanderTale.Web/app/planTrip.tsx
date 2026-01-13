import {StyleSheet} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";

export default function PlanTrip() {
    return(
        <SafeAreaView style={styles.screen}></SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: "#F5EDE4"},
})