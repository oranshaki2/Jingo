import { View, Text } from "react-native";
export function SongCard({ title, artist }: { title: string; artist: string }) {
  return (
    <View style={{ padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 12 }}>
      <Text style={{ fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: "#6b7280" }}>{artist}</Text>
    </View>
  );
}