// app/(auth)/sign-up-difficulty/index.tsx
// This is the second step of the Sign-Up flow.
// The user chooses their English difficulty level: Easy, Medium, or Hard.
// The chosen level is saved temporarily and then passed to the next screen
// (genre selection) so the app can personalise the experience accordingly.

// React core + useState for tracking which difficulty card is currently selected
import React, { useState } from "react";

// UI primitives:
// View = layout box, Text = label,
// Pressable = tappable element, Alert = popup dialog
import { View, Text, Pressable, Alert } from "react-native";

// Stack   = controls the navigation header (title, back button text)
// router  = navigate between screens
// Href    = TypeScript type for route path objects
import { Stack, router, Href } from "expo-router";

// saveSignupData temporarily stores the user's choices (level, genres, etc.)
// across the multi-step sign-up flow, without sending them to the server yet
import { saveSignupData } from "../../../utils/storage";

// Styles defined for this specific screen
import styles from "./_styles";

const EASY = 1;
const MEDIUM = 2;
const HARD = 3;

// ---------------------------------------------------------------------------
// Type alias: Difficulty
// The level can only be exactly 1 (Easy), 2 (Medium), or 3 (Hard).
// Using a union type instead of a plain number prevents accidental invalid values.
// ---------------------------------------------------------------------------
type Difficulty = 1 | 2 | 3;

// ---------------------------------------------------------------------------
// SignUpDifficulty Component
// Renders three selectable difficulty cards and a "Continue" button.
// The user must pick a level before they can proceed.
// ---------------------------------------------------------------------------
export default function SignUpDifficulty() {
  // level = the currently selected difficulty, or null if nothing is chosen yet
  const [level, setLevel] = useState<Difficulty | null>(null);

  // ---------------------------------------------------------------------------
  // goNext — called when the user taps "Continue"
  //
  // 1. If no level was selected, show an error prompt.
  // 2. Otherwise, save the chosen level and navigate to the genre-selection screen,
  //    passing the level as a URL parameter so the next screen can use it.
  // ---------------------------------------------------------------------------
  const goNext = async () => {
    // The user must choose a level before continuing
    if (!level) {
      Alert.alert("בחרו רמה", "אנא בחרו אחת מהאפשרויות כדי להמשיך.");
      return;
    }

    // Persist the level alongside the other sign-up data collected so far
    await saveSignupData("level", level);

    // Go to the next sign-up step, carrying the level value as a route param
    router.push({
      pathname: "/(auth)/choose-genres",
      params: { level: String(level) },
    } as Href);
  };

  // ---------------------------------------------------------------------------
  // Render — the visual layout of the difficulty-selection screen
  // ---------------------------------------------------------------------------
  return (
    // Fragment (<>) lets us return the Stack.Screen config alongside the main View
    // without adding an extra wrapper element to the layout
    <>
      {/* Configure the navigation header for this screen */}
      <Stack.Screen
        options={{
          title: "בחירת רמת קושי", // Header title: "Choose Difficulty Level"
          headerBackTitle: "חזור", // Back button label: "Back"
        }}
      />

      {/* Main screen container */}
      <View style={styles.container}>
        {/* Screen heading: "Choose a level that suits you" */}
        <Text style={styles.title}>בחרו רמה שמתאימה לכם</Text>

        {/* --- Difficulty option cards ---
            Each card shows an emoji, a title and a subtitle.
            Tapping a card sets it as the selected level.
            The `selected` prop controls the highlighted appearance. */}
        <View style={styles.cards}>
          {/* level Easy */}
          <OptionCard
            emoji="🟢"
            title="קל"
            subtitle="מתאים למתחילים"
            selected={level === EASY} // true only when level 1 is active
            onPress={() => setLevel(EASY)} // select this level when tapped
          />

          {/* level Medium */}
          <OptionCard
            emoji="🟡"
            title="בינוני"
            subtitle="עם קצת ניסיון"
            selected={level === MEDIUM}
            onPress={() => setLevel(MEDIUM)}
          />

          {/*level Hard */}
          <OptionCard
            emoji="🔴"
            title="קשה"
            subtitle="לרמה מתקדמת"
            selected={level === HARD}
            onPress={() => setLevel(HARD)}
          />
        </View>

        {/* --- "Continue" button ---
            Disabled (and visually dimmed) until the user picks a level.
            Once a level is selected it becomes fully opaque and tappable. */}
        <Pressable
          onPress={goNext}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && { opacity: 0.92 }, // slight fade when finger is held down
            !level && { opacity: 0.6 }, // dimmed when no level is selected yet
          ]}
          disabled={!level} // completely blocks taps until a level is chosen
          accessibilityRole="button"
          accessibilityLabel="המשך"
        >
          <Text style={styles.primaryButtonText}>המשך</Text>
        </Pressable>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// OptionCard Component
// A reusable card that represents a single difficulty option.
//
// Props:
//   emoji    — colorful circle icon displayed on the left (🟢 / 🟡 / 🔴)
//   title    — main label, e.g. "קל" (Easy)
//   subtitle — secondary description, e.g. "מתאים למתחילים"
//   selected — whether this card is currently chosen (controls highlight style)
//   onPress  — callback fired when the user taps the card
// ---------------------------------------------------------------------------
function OptionCard({
  emoji,
  title,
  subtitle,
  selected,
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected, // highlighted border/bg when selected
        pressed && { transform: [{ scale: 0.995 }] }, // tiny shrink animation on press
      ]}
      accessibilityRole="radio" // signals to screen readers that this is a radio-button style choice
      accessibilityState={{ selected }} // tells screen readers whether this option is currently picked
      accessibilityLabel={`${title} - ${subtitle}`}
    >
      {/* Left side: emoji icon */}
      <Text style={styles.cardEmoji}>{emoji}</Text>

      {/* Middle: title and subtitle stacked vertically */}
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>

      {/* Right side: radio-button circle — filled when selected, empty otherwise */}
      <View
        style={[styles.radio, selected ? styles.radioOn : styles.radioOff]}
      />
    </Pressable>
  );
}
