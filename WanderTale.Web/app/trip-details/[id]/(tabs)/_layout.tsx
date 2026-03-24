import { Tabs } from "expo-router";

export default function TripTabsLayout() {
    return (
        <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: "none" }, }}>
            <Tabs.Screen
                name="index"
                options={{ title: "Overview" }}
            />
            <Tabs.Screen
                name="memories"
                options={{ title: "Memories" }}
            />
        </Tabs>
    );
}