// app/(auth)/sign-up/index.tsx
// This is the first step of the Sign-Up (registration) flow.
// The user picks a username and password here.
// After passing all validations, the data is saved temporarily and the
// user is sent to the next step (choosing difficulty level).

// React core + useState for managing form field values and UI state
import React, { useState } from "react";

// UI building blocks from React Native:
// View = layout box, Text = label, TextInput = editable field,
// Pressable/TouchableOpacity = tappable button,
// Alert = popup dialog, Image = image display
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  TouchableOpacity,
  Image,
} from "react-native";

// router = navigate between screens; Href = type for route path strings
import { router, Href } from "expo-router";

// saveSignupData temporarily stores registration info (username, password)
// so it can be used in the next sign-up steps without sending it to the
// server until everything is collected
import { saveSignupData } from "../../../utils/storage";

// Styles and color constants defined for this screen
import styles, { COLORS } from "./_styles";

// The backend API base URL, read from the app's environment config
const API_URL = process.env.EXPO_PUBLIC_API_URL!;

// ---------------------------------------------------------------------------
// SignUp Component
// Renders the first step of the registration form:
//   - Username input
//   - Password input (with show/hide toggle)
//   - Confirm password input (with show/hide toggle)
//   - "Continue" button that validates everything before proceeding
// ---------------------------------------------------------------------------
export default function SignUp() {
  // --- Local state for each form field ---
  const [username, setUsername] = useState(""); // what the user typed as their username
  const [password, setPassword] = useState(""); // the chosen password
  const [confirm, setConfirm] = useState(""); // the password typed a second time (for confirmation)

  // Controls whether the password characters are hidden (shown as dots) or visible
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  // Same toggle, but for the "confirm password" field
  const [isConfirmHidden, setIsConfirmHidden] = useState(true);

  // True while the form is being submitted — disables the button to prevent double-taps
  const [submitting, setSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // isUsernameTaken — asks the server if a username is already registered
  //
  // Returns:
  //   true  → username is already taken (or we can't confirm it's free)
  //   false → username is available
  // ---------------------------------------------------------------------------
  const isUsernameTaken = async (name: string): Promise<boolean> => {
    try {
      // Query the server for a user with this exact username
      const res = await fetch(
        `${API_URL}/users/by-username/${encodeURIComponent(name.trim())}`,
        { method: "GET", headers: { "Content-Type": "application/json" } },
      );

      // 404 = user not found = the username is free to use
      if (res.status === 404) return false;
      // 200 OK = a user with this name already exists
      if (res.ok) return true;

      // Any other status code (server error, etc.) — show an error and block
      // proceeding to be safe
      Alert.alert(
        "שגיאה",
        "לא ניתן לבדוק זמינות שם משתמש כרגע. נסו שוב בעוד רגע.",
      );
      return true;
    } catch {
      // Network failure — can't reach the server at all
      Alert.alert("שגיאה", "בעיה בחיבור לשרת. נסו שוב מאוחר יותר.");
      return true;
    }
  };

  // ---------------------------------------------------------------------------
  // onSubmit — runs when the user taps the "Continue" button
  //
  // Steps:
  //   1. Validate all fields (not empty, long enough, matching passwords)
  //   2. Check with the server that the username isn't already taken
  //   3. Save the username + password temporarily for the next sign-up steps
  //   4. Navigate to the difficulty-selection screen
  // ---------------------------------------------------------------------------
  const onSubmit = async () => {
    // --- Step 1: Input validation ---

    // Username must not be empty
    if (!username.trim()) {
      Alert.alert("שגיאה", "יש להזין שם משתמש.");
      return;
    }
    // Password must not be empty
    if (!password) {
      Alert.alert("שגיאה", "יש להזין סיסמה.");
      return;
    }
    // Password must be at least 8 characters long
    if (password.length < 8) {
      Alert.alert("שגיאה", "הסיסמה חייבת להכיל לפחות 8 תווים.");
      return;
    }
    // The two password fields must match
    if (password !== confirm) {
      Alert.alert("שגיאה", "הסיסמאות אינן תואמות.");
      return;
    }

    // --- Step 2: Check username availability on the server ---
    const taken = await isUsernameTaken(username);
    if (taken) {
      Alert.alert("שגיאה", "השם משתמש תפוס. בחר/י שם משתמש אחר.");
      return;
    }

    // --- Step 3 & 4: Save the data and move to the next step ---
    try {
      setSubmitting(true); // show loading state on the button

      // Temporarily save the username and password (not sent to the server yet)
      // They will be used together with the rest of the sign-up data at the end
      await saveSignupData("username", username.trim());
      await saveSignupData("password", password);

      // Go to the next screen where the user picks their difficulty level
      router.push("/(auth)/sign-up-difficulty" as Href);
    } catch {
      Alert.alert("שגיאה", "אירעה תקלה בהרשמה. נסו שוב.");
    } finally {
      // Always re-enable the button when done (success or failure)
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render — the visual layout of the screen
  // ---------------------------------------------------------------------------
  return (
    // Outer container that holds all elements on screen
    <View style={styles.container}>
      {/* Screen title: "Sign up and start learning today!" (in Hebrew) */}
      <Text style={styles.title}>הירשמו והתחילו ללמוד היום!</Text>

      {/* --- Username field --- */}
      <View style={styles.field}>
        <Text style={styles.label}>שם משתמש</Text>
        <TextInput
          style={styles.input}
          placeholder="הקלד/י שם משתמש"
          placeholderTextColor="#7A7A7A"
          value={username} // controlled by the username state variable
          onChangeText={setUsername} // updates state on every keystroke
          textAlign="right" // right-to-left layout for Hebrew
          autoCapitalize="none" // don't auto-capitalize (usernames are case-sensitive)
        />
      </View>

      {/* --- Password field with show/hide toggle --- */}
      <View style={styles.field}>
        <Text style={styles.label}>סיסמה</Text>

        {/* Wrapper so we can overlay the eye icon on top of the input */}
        <View style={styles.passwordWrapper}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="הקלד/י סיסמה (לפחות 8 תווים)"
            placeholderTextColor="#7A7A7A"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={isPasswordHidden} // hides characters when true
            textAlign="right"
          />

          {/* Eye icon button — tapping toggles between hiding and showing the password */}
          <TouchableOpacity
            onPress={() => setIsPasswordHidden((prev) => !prev)}
            style={styles.eyeButton}
            activeOpacity={0.7} // slight visual fade when pressed
          >
            <Image
              source={
                isPasswordHidden
                  ? require("@/assets/images/eyeHide.png") // eye with a slash = hidden
                  : require("@/assets/images/eyeShow.png") // open eye = visible
              }
              style={styles.eyeIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- Confirm password field (user types the password a second time to avoid typos) --- */}
      <View style={styles.field}>
        <Text style={styles.label}>וידוא סיסמה</Text>

        <View style={styles.passwordWrapper}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="הקלד/י שוב את הסיסמה"
            placeholderTextColor="#7A7A7A"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={isConfirmHidden} // has its own separate show/hide toggle
            textAlign="right"
          />

          {/* Eye icon for the confirm field — independent from the one above */}
          <TouchableOpacity
            onPress={() => setIsConfirmHidden((prev) => !prev)}
            style={styles.eyeButton}
            activeOpacity={0.7}
          >
            <Image
              source={
                isConfirmHidden
                  ? require("@/assets/images/eyeHide.png")
                  : require("@/assets/images/eyeShow.png")
              }
              style={styles.eyeIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile picture upload was removed from this step */}

      {/* --- "Continue" button ---
          Disabled while the form is submitting to prevent double-taps.
          Shows "registering..." text while loading. */}
      <Pressable
        onPress={onSubmit}
        disabled={submitting}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && { opacity: 0.92 }, // subtle fade when finger is held down
          submitting && { opacity: 0.6 }, // dims while loading
        ]}
        accessibilityRole="button"
        accessibilityLabel="המשך"
      >
        <Text style={styles.primaryButtonText}>
          {/* While submitting show a loading message, otherwise show "Continue" */}
          {submitting ? "נרשם/ת..." : "המשך"}
        </Text>
      </Pressable>

      {/* --- Link to the Sign-In screen for users who already have an account --- */}
      <Pressable
        onPress={() => router.replace("/(auth)/sign-in" as Href)}
        style={styles.linkWrapper}
        accessibilityRole="link"
        accessibilityLabel="מעבר לעמוד התחברות"
      >
        <Text style={styles.linkText}>
          כבר רשומים? <Text style={styles.linkEmph}>לחצו כאן להתחברות</Text>
        </Text>
      </Pressable>
    </View>
  );
}
