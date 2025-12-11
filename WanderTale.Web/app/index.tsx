import { View, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getTrips } from "@/app/api/trips";

export default function Index() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["trips"],
    queryFn: getTrips,
  });

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error loading trips</Text>;

  return (
      <View>
        {data.map((trip: any) => (
            <Text key={trip.id}>{trip.title}</Text>
        ))}
      </View>
  );
}
