import {ImageBackground, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";


export default function NewNote() {

    return (
        <SafeAreaView style={{flex: 1}}>
            <ImageBackground source={require("@/assets/images/TheWorld.png")}
                             style={{flex: 1}}
                             resizeMode="cover">

            </ImageBackground>
        </SafeAreaView>
    )
}