import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="songs" options={{ title: "Songs" }} />
      <Tabs.Screen name="song" options={{ title: "Song" }} />
      <Tabs.Screen name="learn" options={{ title: "Learn" }} />
    </Tabs>
  );
}