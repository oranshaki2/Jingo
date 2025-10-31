import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="home" options={{ title: "ראשי" }} />
      <Tabs.Screen name="settings" options={{ title: "הגדרות" }} />
      <Tabs.Screen name="profile" options={{ title: "פרופיל" }} />
    </Tabs>
  );
}