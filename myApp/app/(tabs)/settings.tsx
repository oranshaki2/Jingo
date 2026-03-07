// app/(tabs)/settings.tsx
// The Settings screen lets the user update two preferences they chose during sign-up:
//   1. Difficulty level  (Easy / Medium / Hard)
//   2. Favourite music genres (one or more from a fixed list)
//
// Changes are sent to the backend in two separate PATCH requests when the
// user taps "Save Changes". The current values are fetched from the server
// when the screen first loads so the controls reflect the true saved state.

// React core + hooks:
// useEffect = run code once when the screen loads (fetch current settings)
// useState  = track the form values and loading state
import React, { useEffect, useState } from "react";

// expo-image: a faster, more feature-rich Image component than the built-in one
import { Image } from "expo-image";

// UI primitives from React Native:
// View              = layout box
// Text              = text label
// StyleSheet        = creates optimised style objects
// ActivityIndicator = spinning loading indicator
// Alert             = popup dialog
// ScrollView        = scrollable container
// Pressable         = tappable element
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
} from "react-native";

// SecureStore reads/writes encrypted data on the device (stores user ID and auth token)
import * as SecureStore from "expo-secure-store";

// SafeAreaView adds padding so content avoids the device notch and status bar
import { SafeAreaView } from "react-native-safe-area-context";

// Stack lets us configure the navigation header for this screen
import { Stack } from "expo-router";

const EAZY = 1;
const MEDIUM = 2;
const HARD = 3;

// ---------------------------------------------------------------------------
// styles — shared layout styles for the screen.
// Stored as a plain object (not StyleSheet.create) because some values are
// not actual style objects (COLORS, GENRES) and are accessed elsewhere.
// ---------------------------------------------------------------------------
// Reuse styles from the sign-up flow
const styles: any = {
  center: { flex: 1, justifyContent: "center", alignItems: "center" }, // full-screen centred layout (used for spinner)
  wrap: { flex: 1, backgroundColor: "#fff" }, // full-screen white background
  container: { padding: 16, alignItems: "stretch" }, // scrollable content area padding
  header: { alignItems: "center", marginBottom: 16 }, // centred header block
  title: { fontSize: 24, fontWeight: "700" }, // large screen title
  titleUnderline: {
    height: 4,
    width: 60,
    backgroundColor: "#2b8aef",
    marginTop: 4,
  }, // decorative blue underline
  cards: { marginVertical: 8 }, // vertical spacing around the difficulty cards
  heading: { fontSize: 18, fontWeight: "600", marginTop: 12 }, // sub-section heading (e.g. "Favourite Genres")
  row: { flexDirection: "row", flexWrap: "wrap" }, // wrapping row used for the genre chips
  primaryButton: {
    backgroundColor: "#2b8aef", // blue background
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  primaryButtonText: { color: "#fff", fontWeight: "600" }, // white bold text inside the button
  COLORS: { primary: "#2b8aef", textDark: "#222" }, // colour constants used inline
  GENRES: new Set(["rock", "pop", "jazz", "classical", "hiphop"]), // (legacy reference — actual set is in state)
};

// The backend API base URL, read from the app's environment config
const API_URL = process.env.EXPO_PUBLIC_API_URL!;

// GenreItem — a genre can arrive from the server either as a plain string
// (just the key) or as an object with a key and optional label/title.
// This type covers both shapes.
type GenreItem = { key: string; label?: string; title?: string } | string;

// ---------------------------------------------------------------------------
// local — additional styles specific to this screen, compiled with
// StyleSheet.create for better runtime performance.
// ---------------------------------------------------------------------------
const local = StyleSheet.create({
  // Difficulty option card (one row per level)
  optionCard: {
    flexDirection: "row-reverse", // emoji on the right, text on the left (RTL for Hebrew)
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginVertical: 6,
    marginHorizontal: 4,
    elevation: 1, // subtle drop-shadow on Android
  },
  // Blue border applied when this card's level is the currently selected one
  optionCardSelected: {
    borderColor: "#2b8aef",
    borderWidth: 1.5,
  },
  // The coloured circle emoji (🟢 / 🟡 / 🔴)
  emoji: {
    fontSize: 28,
    marginLeft: 10, // Adjust spacing for right alignment
  },
  // Container for the title + subtitle text block
  optionText: {
    flexDirection: "column",
    alignItems: "flex-end", // Align text to the right (Hebrew RTL)
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  optionSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  // Genre chip / pill button (unselected state)
  genreCard: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20, // fully rounded pill shape
    backgroundColor: "#f3f3f3",
    margin: 6,
    alignSelf: "flex-end", // Align genre cards to the right
  },
  // Genre chip when it is selected — filled blue
  genreCardSelected: {
    backgroundColor: "#2b8aef",
  },
  // Genre label text (unselected)
  genreText: {
    color: "#333",
    fontSize: 13,
    textAlign: "right", // Align text inside genre cards to the right
  },
  // Genre label text when selected — white so it's readable on the blue background
  genreTextSelected: {
    color: "#fff",
  },
});

// ---------------------------------------------------------------------------
// OptionCard — a single difficulty-level row.
//
// Props:
//   emoji    = coloured circle icon (🟢 Easy / 🟡 Medium / 🔴 Hard)
//   title    = level name in Hebrew (e.g. "קל")
//   subtitle = short description in Hebrew (e.g. "מתאים למתחילים")
//   selected = true when this level is the currently chosen one (adds a blue border)
//   onPress  = callback fired when the user taps this card
// ---------------------------------------------------------------------------
const OptionCard: React.FC<{
  emoji: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}> = ({ emoji, title, subtitle, selected, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        local.optionCard,
        selected && local.optionCardSelected, // blue border when this level is active
        pressed && { opacity: 0.9 }, // slight fade on press
      ]}
    >
      {/* Coloured circle emoji on the right side */}
      <Text style={local.emoji}>{emoji}</Text>

      {/* Title and subtitle text on the left side */}
      <View style={local.optionText}>
        <Text style={local.optionTitle}>{title}</Text>
        <Text style={local.optionSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
};

// ---------------------------------------------------------------------------
// GenreCard — a small pill/chip button representing one music genre.
//
// Props:
//   label    = Hebrew genre name displayed on the chip (e.g. "רוק")
//   selected = true when this genre is in the user's chosen set (blue fill)
//   onPress  = callback fired when the user taps this chip (toggles selection)
// ---------------------------------------------------------------------------
const GenreCard: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
}> = ({ label, selected, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      style={[
        local.genreCard,
        selected && local.genreCardSelected, // blue fill when genre is selected
      ]}
    >
      {/* Genre name — white when selected, dark grey otherwise */}
      <Text style={[local.genreText, selected && local.genreTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
};

// ---------------------------------------------------------------------------
// ALL_GENRES — the complete list of genres the user can choose from.
// Each entry has:
//   key   = internal identifier sent to the server
//   label = Hebrew display name shown on the chip
// Adding or removing a genre here updates the settings screen automatically.
// ---------------------------------------------------------------------------
const ALL_GENRES = [
  { key: "rock", label: "רוק" },
  { key: "pop", label: "פופ" },
  { key: "R&B", label: "רית'ם אנד בלוז" },
  { key: "Hip-Hop", label: "היפ-הופ" },
  { key: "metal", label: "מטאל" },
  { key: "jazz", label: "ג'אז" },
  { key: "folk", label: "פולק" },
  { key: "electronic", label: "אלקטרוני" },
  { key: "country", label: "קאנטרי" },
  { key: "indie", label: "אינדי" },
];

// ---------------------------------------------------------------------------
// Settings Component
// Displays and allows editing of the user's difficulty level and genre preferences.
// ---------------------------------------------------------------------------
export default function Settings() {
  // userData = the full user object returned by the server (username, level, genres).
  // null while loading or if the fetch failed.
  const [userData, setUserData] = useState<null | {
    username: string;
    level: number;
    genres: string[];
  }>(null);

  // loading = true while the initial fetch is in progress (shows a spinner)
  const [loading, setLoading] = useState(true);

  // level = the difficulty level currently selected in the UI (1=Easy, 2=Medium, 3=Hard).
  // Initialised from the server value; updated instantly when the user taps a card.
  const [level, setLevel] = useState<number | null>(null);

  // selectedGenres = the set of genre keys the user has currently toggled ON.
  // A Set is used for O(1) has/add/delete operations.
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Fetch the user's current settings when the screen first mounts.
  //
  // Steps:
  //   1. Read the userId and auth token from encrypted device storage.
  //   2. GET /users/:id with the token in the Authorization header.
  //   3. Populate the level and selectedGenres state with the server values
  //      so the UI reflects what is actually saved.
  //
  // The empty [] means this runs exactly once — not on every re-render.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Step 1: retrieve credentials
        const userId = await SecureStore.getItemAsync("user_id");
        const token = await SecureStore.getItemAsync("auth_token");

        if (!userId || !token) {
          Alert.alert("שגיאה", "לא נמצאו פרטי משתמש.");
          return;
        }

        // Step 2: fetch the user's profile from the server
        const res = await fetch(`${API_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }, // prove who we are
        });

        if (!res.ok) throw new Error("נכשל לקבל את פרטי המשתמש");

        // Step 3: seed the form controls with the saved values
        const data = await res.json();
        setUserData(data); // store full user object
        setLevel(data.level); // pre-select the saved difficulty
        setSelectedGenres(new Set(data.genres)); // pre-tick the saved genres
      } catch (err: any) {
        Alert.alert("שגיאה", err.message || "אירעה שגיאה");
      } finally {
        setLoading(false); // always hide the spinner when done
      }
    };

    fetchUserData();
  }, []); // empty array = run only once on mount

  // ---------------------------------------------------------------------------
  // toggleGenre — adds a genre to the selection if it isn't there yet,
  // or removes it if it already is. This is the checkbox / pill-toggle behaviour.
  // We copy the Set before modifying it so React detects the state change.
  // ---------------------------------------------------------------------------
  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev); // copy so we don't mutate state directly
      next.has(genre) ? next.delete(genre) : next.add(genre); // toggle
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // saveChanges — called when the user taps "Save Changes".
  //
  // Sends two separate PATCH requests to the server:
  //   1. PATCH /users/:id/level  — updates the difficulty level
  //   2. PATCH /users/:id/genres — updates the genre list
  //
  // Both requests require the auth token in the Authorization header.
  // If either request fails, an error alert is shown and saving stops.
  // On full success, a confirmation alert is shown.
  // ---------------------------------------------------------------------------
  const saveChanges = async () => {
    try {
      // Read credentials from secure storage
      const userId = await SecureStore.getItemAsync("user_id");
      const token = await SecureStore.getItemAsync("auth_token");

      if (!userId || !token) {
        Alert.alert("שגיאה", "לא נמצאו פרטי משתמש.");
        return;
      }

      // Request 1: update the difficulty level (only if a level has been chosen)
      if (level !== null) {
        const levelRes = await fetch(`${API_URL}/users/${userId}/level`, {
          method: "PATCH", // PATCH = partial update (only the level field changes)
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ level }), // send the new level number
        });

        if (!levelRes.ok) throw new Error("עדכון רמת הקושי נכשל");
      }

      // Request 2: update the genres list
      // Convert the Set back to a plain array for JSON serialisation
      const genresRes = await fetch(`${API_URL}/users/${userId}/genres`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ genres: Array.from(selectedGenres) }), // Set → Array
      });

      if (!genresRes.ok) throw new Error("עדכון הז'אנרים נכשל");

      // Both requests succeeded
      Alert.alert("הצלחה", "השינויים נשמרו בהצלחה.");
    } catch (err: any) {
      Alert.alert("שגיאה", err.message || "אירעה שגיאה");
    }
  };

  // ---------------------------------------------------------------------------
  // Loading state — shown while the initial fetch is running.
  // A full-screen spinner keeps the UI clean instead of showing empty controls.
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={styles.COLORS.primary} />
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Error / empty state — shown if the fetch completed but returned no data.
  // This is a safety fallback; in normal use userData is always populated.
  // ---------------------------------------------------------------------------
  if (!userData) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: styles.COLORS.textDark }}>לא נמצאו נתונים</Text>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render — the settings form.
  // Layout:
  //   ┌──────────────────────────┐
  //   │  Header (title + GIF)    │
  //   ├──────────────────────────┤
  //   │  ScrollView              │
  //   │    ▸ Difficulty cards    │
  //   │    ▸ Genre chips         │
  //   │    ▸ Save button         │
  //   └──────────────────────────┘
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.wrap}>
      {/* Hide the default navigation header — we draw our own below */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* --- Screen header: title + animated GIF --- */}
      <View style={styles.header}>
        <Text style={styles.title}>הגדרות</Text>
        {/* Decorative blue underline beneath the title */}
        <View style={styles.titleUnderline} />
        {/* Animated GIF for a friendly, playful look */}
        <Image
          source={require("../../assets/gif/head-moves.gif")}
          style={{ width: 100, height: 100 }}
        />
      </View>

      {/* Scrollable content area (in case the screen is short) */}
      <ScrollView contentContainerStyle={styles.container}>
        {/* ----------------------------------------------------------------
            DIFFICULTY SELECTION
            Three OptionCards for Easy / Medium / Hard.
            Tapping one calls setLevel() which immediately highlights it
            (the `selected` prop compares level === 1/2/3).
        ---------------------------------------------------------------- */}
        {/* Difficulty Selection */}
        <View style={styles.cards}>
          {/* level Easy */}
          <OptionCard
            emoji="🟢"
            title="קל"
            subtitle="מתאים למתחילים"
            selected={level === EAZY} // true only when level 1 is the active choice
            onPress={() => setLevel(EAZY)} // select Easy when tapped
          />
          {/* level Medium */}
          <OptionCard
            emoji="🟡"
            title="בינוני"
            subtitle="עם קצת ניסיון"
            selected={level === MEDIUM}
            onPress={() => setLevel(MEDIUM)}
          />
          {/* level Hard */}
          <OptionCard
            emoji="🔴"
            title="קשה"
            subtitle="לרמה מתקדמת"
            selected={level === HARD}
            onPress={() => setLevel(HARD)}
          />
        </View>

        {/* ----------------------------------------------------------------
            GENRE SELECTION
            A wrapping row of pill chips — one per genre in ALL_GENRES.
            Tapping a chip calls toggleGenre() to add/remove it from the Set.
            The `selected` prop checks selectedGenres.has(genre.key).
        ---------------------------------------------------------------- */}
        {/* Genre Selection */}
        <Text style={[styles.heading, { textAlign: "center" }]}>
          ז'אנרים מועדפים
        </Text>
        <View style={[styles.row, { justifyContent: "center" }]}>
          {ALL_GENRES.map((genre) => (
            <GenreCard
              key={genre.key}
              label={genre.label}
              selected={selectedGenres.has(genre.key)} // blue fill when this genre is chosen
              onPress={() => toggleGenre(genre.key)} // add/remove from the Set
            />
          ))}
        </View>

        {/* ----------------------------------------------------------------
            SAVE BUTTON
            Sends two PATCH requests to the server (level + genres).
            Shows a subtle opacity fade when pressed.
        ---------------------------------------------------------------- */}
        {/* Save Button */}
        <Pressable
          onPress={saveChanges}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && { opacity: 0.92 }, // slight fade when finger is held down
          ]}
          accessibilityRole="button"
          accessibilityLabel="שמור שינויים"
        >
          <Text style={styles.primaryButtonText}>שמור שינויים</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
