// app/landing-screen/index.tsx
import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Href } from "expo-router";
import styles from "./_styles";

export default function Landing() {
  const goSignIn = () => router.push("/(auth)/sign-in" as Href);
  const goSignUp = () => router.push("/(auth)/sign-up" as Href);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Logo */}
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>ברוכים הבאים</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroText}>מרחב פרטי ללמידת אנגלית</Text>
          <Text style={styles.heroText}>בעזרת שירים.</Text>
        </View>

        <View style={styles.buttons}>
          <Pressable
            onPress={goSignIn}
            style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.92 }]}
          >
            <Text style={styles.btnPrimaryText}>התחברות</Text>
          </Pressable>

          <Pressable
            onPress={goSignUp}
            style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.92 }]}
          >
            <Text style={styles.btnGhostText}>הרשמה</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
