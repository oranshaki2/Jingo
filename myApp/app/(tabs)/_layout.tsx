import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons"; // you can also use Feather, MaterialIcons, etc.
/*
  This is the root layout for the "(tabs)" group of screens.
  It defines the bottom tab navigator that appears on all screens within this group.
  Each screen in the group is defined as a child of this layout (e.g. home.tsx, settings.tsx).
*/  
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#4EC4C4",
        tabBarInactiveTintColor: "#1A3D5A",
        tabBarStyle: {
          backgroundColor: "#F5F7F9",
          borderTopColor: "#E0E0E0",
          height: 60,
          paddingBottom: 6,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";

          if (route.name === "home") iconName = focused ? "home" : "home-outline";
          else if (route.name === "settings") iconName = focused ? "settings" : "settings-outline";
          else if (route.name === "profile") iconName = focused ? "person" : "person-outline";

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "ראשי",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "הגדרות",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "פרופיל",
        }}
      />
    </Tabs>
  );
}