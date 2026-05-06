import { Stack } from "expo-router";

export default function TripDetailsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="new-entry" />
            <Stack.Screen name="new-photo" />
            <Stack.Screen name="album" />
            <Stack.Screen name="entry/[entryId]" />
        </Stack>
    );
}