// app/index.tsx
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";

export default function Index() {
  useEffect(() => {
    // TODO: החליפי כאן בלוגיקה אמיתית (בדיקת טוקן / קריאת API)
    const isSignedIn = false;

    if (isSignedIn) {
      // משתמש מחובר → מעבירים ישר לדף הבית
      router.replace("/(tabs)/home");
    } else {
      // משתמש לא מחובר → נוחת קודם בלנדים
      router.replace("/landing-screen");
    }
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}