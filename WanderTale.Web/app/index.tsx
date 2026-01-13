import {View, Text, ImageBackground, Pressable, StyleSheet, FlatList} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getTrips } from "@/api/trips";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {router} from "expo-router";

type Trip = { id: string; title: string; startDate: string; endDate: string };

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("sv-SE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export default function Index() {
  const { data, isLoading, error } = useQuery<Trip[]>({
    queryKey: ["trips"],
    queryFn: getTrips,
  });

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error loading trips</Text>;

    const trips = data ?? [];

  return (
      <SafeAreaView style={styles.screen}>
          <View style={ styles.top }> 
              <Text style={ styles.headline }> Mina resor</Text>
              <View style={ styles.newTrip}>
                  <Pressable style={{ alignItems: "center" }} onPress={() => router.push("/planTrip")}>
                  <Ionicons name="location-outline" size={40} color="#333" />
                  <Text style={ styles.iconText}>Ny resa</Text>
                      </Pressable>
              </View></View>
      <View style={ styles.bottom}>
          <ImageBackground
              source={require("@/assets/images/TheWorld.png")}
              style={{ flex: 1 }}
              resizeMode="cover"
          >
              <FlatList
                  contentContainerStyle={styles.listContent}
                  data={trips}
                  keyExtractor={(trip) => trip.id}
                  renderItem={({ item }) => (
                      <Pressable style={styles.tripCard}>
                          <View style={styles.tripRow}>
                          <Text style={styles.tripTitle}>{item.title}</Text>
                          <Text style={styles.tripDate}>{formatDate(item.startDate)}</Text>
                          </View>
                      </Pressable>
                  )}
              />
          </ImageBackground>
      </View>          
        
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F5EDE4" },
    
    newTrip: {
        marginTop: 16, 
        alignItems: "center",
        paddingVertical: 20,
    },
    
    top: {
        flex: 1, alignItems: "center", 
        justifyContent: "center",
        borderBottomWidth: 15,
        borderBottomColor: "#C0C0C0",
    },
    
    headline: {
        fontSize: 30, 
        letterSpacing: 1
    },
    
    iconText: {
        fontSize: 18,
    },

    bottom: {
        flex: 2
    },
    
    mapBg: {
        flex: 1,
    },

    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        gap: 16,
    },

    tripCard: {
        alignSelf: "center", 
        width: "100%",
        maxWidth: 350,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "#D5F7F4",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
    },
    tripTitle: {
        fontSize: 16,
        fontWeight: "600",        
    },

    tripDate: {
        marginTop: 4,
        fontSize: 13,
        opacity: 0.6,
    },

    tripRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",  
    },
})
