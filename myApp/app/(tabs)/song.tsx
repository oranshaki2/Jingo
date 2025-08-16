import { View, Text, Button } from "react-native";
import { router } from "expo-router";
export default function Song() {
  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 24 }}>Song Details</Text>
      <Button title="Start learning" onPress={() => router.push("/(tabs)/learn")} />
    </View>
  );
}