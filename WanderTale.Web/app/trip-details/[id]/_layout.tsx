import { Stack } from "expo-router";

export default function TripDetailsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="new-entry" />
        </Stack>
    );
}