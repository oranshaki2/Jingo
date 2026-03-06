// app/(auth)/sign-in/index.tsx
// This is the Sign-In screen of the app.
// It shows a form where the user types their username and password
// to log in. On success, it stores the authentication token securely
// and navigates the user to the home screen.

// React core + the useState hook for managing local state
import React, { useState } from "react";

// UI components from React Native:
// View = container/box, Text = label, TextInput = text field,
// Pressable/TouchableOpacity = tappable button, Alert = popup dialog,
// ActivityIndicator = spinning loading icon, Image = image display
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";

// router lets us navigate between screens; Href is just a type for route paths
import { router, Href } from "expo-router";

// SecureStore saves sensitive data (like tokens) encrypted on the device
import * as SecureStore from "expo-secure-store";

// Styles and color constants defined in _styles.ts (same folder)
import styles, { COLORS } from "./_styles";

// The base URL of the backend API, loaded from the environment config file
const API_URL = process.env.EXPO_PUBLIC_API_URL!;

// ---------------------------------------------------------------------------
// SignIn Component
// This is the main (and only) component exported from this file.
// It renders the entire sign-in screen.
// ---------------------------------------------------------------------------
export default function SignIn() {
  // --- Local state ---
  // username: whatever the user has typed in the username field
  const [username, setUsername] = useState("");
  // password: whatever the user has typed in the password field
  const [password, setPassword] = useState("");
  // isPasswordHidden: controls whether the password is shown as dots or plain text
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  // submitting: true while the login request is in progress (to disable the button and show a spinner)
  const [submitting, setSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // onSubmit — called when the user taps the "Login" button
  // ---------------------------------------------------------------------------
  const onSubmit = async () => {
    // 1. Basic validation: both fields must be filled in
    if (!username.trim() || !password) {
      Alert.alert("שגיאה", "יש למלא את כל השדות.");
      return;
    }

    // 2. Set up a 10-second timeout so the app doesn't hang forever
    //    if the server is unreachable
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      // 3. Send a POST request to the server's /tokens endpoint
      //    with the username and password in the request body (as JSON)
      const res = await fetch(`${API_URL}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal, // allows the request to be aborted on timeout
        body: JSON.stringify({ username: username.trim(), password }),
      });

      // 4. If the server responded with an error status (e.g. 401 Unauthorized),
      //    try to read the error message from the server and throw it
      if (!res.ok) {
        // Default error message shown to the user
        let msg = "שם משתמש או סיסמה שגויים";
        try {
          const data = await res.json();
          if (data?.message) msg = data.message; // use server's message if available
        } catch (_) {
          // ignore JSON parse errors — keep the default message
        }
        throw new Error(msg);
      }

      // 5. Parse the successful response — it contains a token and user info
      const data = await res.json();
      const token: string | undefined = data?.token;
      const user = data?.user;

      // If for some reason the token is missing, treat it as an error
      if (!token) throw new Error("Token not found in server response");

      // 6. Save the auth token securely on the device.
      //    This token will be sent with future requests to prove the user is logged in.
      await SecureStore.setItemAsync("auth_token", token);

      // Save the user's ID so other parts of the app can access it easily
      if (user?.id) await SecureStore.setItemAsync("user_id", String(user.id));

      // Save the username so other parts of the app can display it easily
      if (user?.username)
        await SecureStore.setItemAsync("username", user.username);

      // 7. Show a success message and navigate to the main home screen
      Alert.alert("הצלחה", "ההתחברות בוצעה בהצלחה!");
      router.replace("/(tabs)/home");
    } catch (err: any) {
      // Handle different error types with user-friendly messages
      if (err?.name === "AbortError") {
        // The request took too long (exceeded the 10-second timeout)
        Alert.alert("תקלה", "בזמן ניסיון ההתחברות עבר זמן ההמתנה. נסו שוב.");
      } else {
        // Any other error (wrong credentials, network issue, etc.)
        Alert.alert("שגיאה", err?.message || "נכשל בהתחברות. נסו שוב.");
      }
    } finally {
      // Always runs after try/catch — clear the timeout and re-enable the button
      clearTimeout(timeout);
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render — what the screen actually looks like
  // ---------------------------------------------------------------------------
  return (
    // Outer container that holds all screen elements
    <View style={styles.container}>
      {/* Screen title: "Sign In" (in Hebrew) */}
      <Text style={styles.title}>התחברות</Text>

      {/* --- Username field --- */}
      <View style={styles.field}>
        <Text style={styles.label}>שם משתמש</Text>
        <TextInput
          style={styles.input}
          placeholder="הקלד/י שם משתמש"
          placeholderTextColor="#7A7A7A"
          value={username} // controlled by the username state variable
          onChangeText={setUsername} // updates state on every keystroke
          autoCapitalize="none" // don't auto-capitalize (usernames are case-sensitive)
          textAlign="right" // right-to-left layout for Hebrew
        />
      </View>

      {/* --- Password field with show/hide toggle --- */}
      <View style={styles.field}>
        <Text style={styles.label}>סיסמה</Text>

        {/* Wrapper to position the eye icon inside/next to the input */}
        <View style={styles.passwordWrapper}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="הקלד/י סיסמה"
            placeholderTextColor="#7A7A7A"
            value={password}
            onChangeText={setPassword}
            textAlign="right"
            secureTextEntry={isPasswordHidden} // hides characters when true (shows dots)
          />

          {/* Eye icon button — tapping it toggles password visibility */}
          <TouchableOpacity
            onPress={() => setIsPasswordHidden((prev) => !prev)}
            style={styles.eyeButton}
            activeOpacity={0.7} // slight fade when pressed
          >
            <Image
              // Switch between "eye hidden" and "eye visible" icons
              source={
                isPasswordHidden
                  ? require("@/assets/images/eyeHide.png")
                  : require("@/assets/images/eyeShow.png")
              }
              style={styles.eyeIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- Login button ---
          Disabled while submitting to prevent double-taps.
          Shows a spinner while the request is in progress. */}
      <Pressable
        onPress={onSubmit}
        disabled={submitting}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && { opacity: 0.9 }, // slightly fades when finger is held down
          submitting && { opacity: 0.6 }, // visually dims while loading
        ]}
      >
        {submitting ? (
          // Show a loading spinner while waiting for the server response
          <ActivityIndicator color="#fff" />
        ) : (
          // Normal button label: "Log in" in Hebrew
          <Text style={styles.primaryButtonText}>התחבר/י</Text>
        )}
      </Pressable>

      {/* --- Link to the Sign-Up screen for users who don't have an account yet --- */}
      <Pressable
        onPress={() => router.push("/(auth)/sign-up" as Href)}
        style={styles.linkWrapper}
      >
        <Text style={styles.linkText}>
          אין לך חשבון? <Text style={styles.linkEmph}>הרשם/י עכשיו</Text>
        </Text>
      </Pressable>
    </View>
  );
}
