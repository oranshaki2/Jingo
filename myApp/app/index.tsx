// app/index.tsx
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as SecureStore from 'expo-secure-store';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync("auth_token");

        if (token) {
          router.replace("/(tabs)/home");
        } else {
          router.replace("/landing-screen");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.replace("/landing-screen");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <View>
          {/* Render content after auth check */}
        </View>
      )}
    </View>
  );
}