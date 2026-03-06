// app/landing-screen/index.tsx
// This is the very first screen a new (unauthenticated) user sees when they open the app.
// It shows the app logo, a short tagline, and two buttons:
//   - "Sign In"  → takes existing users to the login screen
//   - "Sign Up"  → takes new users to the registration flow

// React core — needed for every React component
import React from "react";

// UI primitives from React Native:
// View     = invisible layout box (like a <div>)
// Text     = displays a string on screen
// Image    = displays a picture
// Pressable = a tappable element (button-like)
import { View, Text, Image, Pressable } from "react-native";

// SafeAreaView automatically adds padding so content doesn't overlap
// the device's status bar, notch, or home indicator
import { SafeAreaView } from "react-native-safe-area-context";

// router = lets us programmatically navigate to a different screen
// Href   = TypeScript type that represents a valid route path
import { router, Href } from "expo-router";

// Styles specific to this screen, defined in _styles.ts (same folder)
import styles from "./_styles";

// ---------------------------------------------------------------------------
// Landing Component
// The welcome / splash screen of the app.
// No props, no state — it's a purely visual screen with two navigation actions.
// ---------------------------------------------------------------------------
export default function Landing() {
  // Navigate to the Sign-In screen (for users who already have an account)
  const goSignIn = () => router.push("/(auth)/sign-in" as Href);

  // Navigate to the Sign-Up screen (for users who are new and want to register)
  const goSignUp = () => router.push("/(auth)/sign-up" as Href);

  return (
    // SafeAreaView wraps the entire screen so nothing is hidden behind
    // the device's notch, status bar, or rounded corners
    <SafeAreaView style={styles.safe}>
      {/* Inner container that centres and spaces all the content */}
      <View style={styles.container}>
        {/* App logo displayed at the top of the screen */}
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain" // scales the image to fit without cropping
        />

        {/* Welcome heading: "Welcome" in Hebrew */}
        <Text style={styles.title}>ברוכים הבאים</Text>

        {/* Hero card — a short tagline describing what the app does:
            "A private space for learning English through songs." */}
        <View style={styles.heroCard}>
          <Text style={styles.heroText}>מרחב פרטי ללמידת אנגלית</Text>
          <Text style={styles.heroText}>בעזרת שירים.</Text>
        </View>

        {/* Button row — two buttons stacked/arranged by the styles */}
        <View style={styles.buttons}>
          {/* Primary (filled) button — for existing users who want to log in */}
          <Pressable
            onPress={goSignIn}
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && { opacity: 0.92 }, // subtle fade when finger is held down
            ]}
          >
            <Text style={styles.btnPrimaryText}>התחברות</Text>
          </Pressable>

          {/* Ghost (outlined / transparent) button — for new users who want to register */}
          <Pressable
            onPress={goSignUp}
            style={({ pressed }) => [
              styles.btnGhost,
              pressed && { opacity: 0.92 }, // same subtle fade on press
            ]}
          >
            <Text style={styles.btnGhostText}>הרשמה</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
