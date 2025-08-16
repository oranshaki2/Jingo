// app/index.tsx
// import { Redirect } from 'expo-router';

// export default function Index() {
//   return <Redirect href="/sign-up" />;
// }
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";

export default function Index() {
  useEffect(() => {
    // TODO: replace with real auth check
    const isSignedIn = false;
    if (isSignedIn) router.replace("/(tabs)/home");
    else router.replace("/(auth)/sign-in");
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}