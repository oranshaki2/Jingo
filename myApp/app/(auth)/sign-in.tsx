import { View, Text, Button } from "react-native";
import { router } from "expo-router";

export default function SignIn() {
  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 24, marginBottom: 16 }}>Sign In</Text>
      {/* TODO: form */}
      <Button title="Sign In" onPress={() => router.replace("/(tabs)/home")} />
      <Button title="Go to Sign Up" onPress={() => router.push("/(auth)/sign-up")} />
    </View>
  );
}