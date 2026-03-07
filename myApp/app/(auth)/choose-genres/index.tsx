// app/(auth)/choose-genres/index.tsx
// This is the third (final) step of the Sign-Up flow.
// The user picks one or more music genres they enjoy.
// When they tap "Finish", all the data collected across the sign-up steps
// (username, password, difficulty level, and genres) is sent to the server
// to create the new account. On success the user is sent to the sign-in screen.

// React core:
// useState  = track which genres are currently selected
// useMemo   = cache an expensive computation so it doesn't re-run on every render
import React, { useMemo, useState } from "react";

// UI primitives:
// View      = layout box
// Text      = label
// Pressable = tappable element
// Image     = displays a picture
// Alert     = popup dialog
// FlatList  = efficient scrollable list (only renders items currently visible on screen)
import { View, Text, Pressable, Image, Alert, FlatList } from "react-native";

// Stack  = controls navigation header (title, back button text)
// router = programmatically navigate between screens
// Href   = TypeScript type for route path strings/objects
import { Stack, router, Href } from "expo-router";

// loadSignupData  = reads data saved in earlier sign-up steps (username, password, level)
// clearSignupData = wipes that temporary storage once registration is complete
import { loadSignupData, clearSignupData } from "../../../utils/storage";

// Styles defined for this specific screen
import styles from "./_styles";

// ---------------------------------------------------------------------------
// Type: GenreKey
// A strict list of all valid genre identifiers.
// Using a union type means TypeScript will catch any typos at compile time.
// ---------------------------------------------------------------------------
type GenreKey =
  | "rock"
  | "pop"
  | "R&B"
  | "Hip-Hop"
  | "metal"
  | "jazz"
  | "folk"
  | "electronic"
  | "country"
  | "indie";

// ---------------------------------------------------------------------------
// Type: GenreItem
// Describes one entry in the genres list:
//   key   = internal identifier (used in logic and sent to the server)
//   label = display name shown to the user (in Hebrew)
//   src   = the image file to display on the card
// ---------------------------------------------------------------------------
type GenreItem = { key: GenreKey; label: string; src: any };

// ---------------------------------------------------------------------------
// GENRES — the full list of genre options shown on screen.
// Each entry has a unique key, a Hebrew label, and a cover image.
// Adding or removing a genre here is all that's needed to change the options.
// ---------------------------------------------------------------------------
const GENRES: GenreItem[] = [
  {
    key: "rock",
    label: "רוק",
    src: require("../../../assets/genres/rock.jpg"),
  },
  { key: "pop", label: "פופ", src: require("../../../assets/genres/pop.jpg") },
  {
    key: "R&B",
    label: "רית'ם אנד בלוז",
    src: require("../../../assets/genres/rnb.jpg"),
  },
  {
    key: "Hip-Hop",
    label: "היפ-הופ",
    src: require("../../../assets/genres/hiphop.jpg"),
  },
  {
    key: "metal",
    label: "מטאל",
    src: require("../../../assets/genres/metal.jpg"),
  },
  {
    key: "jazz",
    label: "ג'אז",
    src: require("../../../assets/genres/jazz.jpg"),
  },
  {
    key: "folk",
    label: "פולק",
    src: require("../../../assets/genres/folk.jpg"),
  },
  {
    key: "electronic",
    label: "אלקטרוני",
    src: require("../../../assets/genres/electronic.jpg"),
  },
  {
    key: "country",
    label: "קאנטרי",
    src: require("../../../assets/genres/country.jpg"),
  },
  {
    key: "indie",
    label: "אינדי",
    src: require("../../../assets/genres/indie.jpg"),
  },
];

// ---------------------------------------------------------------------------
// ChooseGenres Component
// Renders a scrollable 2-column grid of genre cards.
// The user can tap multiple cards to select their favourite genres,
// then tap "Finish" to complete registration.
// ---------------------------------------------------------------------------
export default function ChooseGenres() {
  // A Set of genre keys that the user has currently selected.
  // A Set is used (instead of an array) so lookups like selected.has("rock")
  // are O(1) and adding/removing items is straightforward.
  const [selected, setSelected] = useState<Set<GenreKey>>(new Set());

  // ---------------------------------------------------------------------------
  // dataInPairs — groups the flat GENRES array into pairs: [[genre1, genre2], [genre3, genre4], ...]
  // This is needed because we display 2 cards per row.
  // If the total number of genres is odd, the last pair gets `null` as its second item
  // (the GenreCard component handles null by rendering an empty placeholder).
  //
  // useMemo means this grouping is computed only once (GENRES never changes at runtime),
  // not on every re-render.
  // ---------------------------------------------------------------------------
  const dataInPairs = useMemo(() => {
    const pairs: (GenreItem | null)[][] = [];
    for (let i = 0; i < GENRES.length; i += 2) {
      pairs.push([GENRES[i], GENRES[i + 1] ?? null]); // ?? null handles odd-length lists
    }
    return pairs;
  }, []); // empty dependency array = only run once

  // ---------------------------------------------------------------------------
  // toggle — adds a genre to the selection if it's not there yet, or removes it if it is.
  // This is the "checkbox" behaviour: tap once to select, tap again to deselect.
  // ---------------------------------------------------------------------------
  const toggle = (key?: GenreKey) => {
    if (!key) return; // safety guard — do nothing if called with no key

    setSelected((prev) => {
      const next = new Set(prev); // copy the current set so we don't mutate state directly
      next.has(key) ? next.delete(key) : next.add(key); // toggle the key
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // onFinish — called when the user taps the "Finish" button.
  //
  // Steps:
  //   1. Validate: at least one genre must be selected.
  //   2. Load all previously saved sign-up data (username, password, level).
  //   3. Guard: if any required field is missing, abort and ask the user to restart.
  //   4. Send all the data to the server as a single POST /users request.
  //   5. On success: clear the temporary storage and navigate to the sign-in screen.
  //   6. On failure: show an error alert.
  // ---------------------------------------------------------------------------
  const onFinish = async () => {
    // Step 1: at least one genre must be chosen
    if (selected.size === 0) {
      Alert.alert("בחירת ז'אנרים", "אנא בחרו לפחות ז'אנר אחד כדי להמשיך.");
      return;
    }

    try {
      // Step 2: retrieve the data saved in the previous sign-up steps
      const username = await loadSignupData<string>("username");
      const password = await loadSignupData<string>("password");
      const level = await loadSignupData<number>("level");
      // Convert the Set of selected genre keys to a plain array for the API call
      const genres = Array.from(selected);

      // Step 3: make sure nothing is missing (e.g. user somehow skipped a step)
      if (!username || !password || !level) {
        Alert.alert("שגיאה", "פרטי ההרשמה חסרים. התחילו מחדש.");
        return;
      }

      // Step 4: send the complete registration data to the backend
      const API_URL = process.env.EXPO_PUBLIC_API_URL!;
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The server receives all four fields in one request
        body: JSON.stringify({ username, password, level, genres }),
      });

      // If the server responds with an error status, throw so we jump to catch
      if (!res.ok) throw new Error("הרשמה נכשלה");

      // Step 5: clean up — delete the temporarily stored sign-up data from the device
      await clearSignupData();

      // Tell the user registration succeeded and send them to the sign-in screen
      Alert.alert("ההרשמה בוצעה בהצלחה!", "התחברו כדי להמשיך.");
      router.replace("/(auth)/sign-in" as Href);
    } catch (e) {
      // Step 6: something went wrong (network error, server error, etc.)
      console.error(e);
      Alert.alert("שגיאה", "אירעה שגיאה בהרשמה. נסו שוב.");
    }
  };

  // ---------------------------------------------------------------------------
  // Render — the visual layout of the genre-selection screen
  // ---------------------------------------------------------------------------
  return (
    // Fragment wraps the navigation header config and the screen content
    // without adding an extra element to the layout
    <>
      {/* Configure the navigation header */}
      <Stack.Screen
        options={{ title: "בחירת ז'אנרים", headerBackTitle: "חזור" }}
      />

      {/* Main screen container */}
      <View style={styles.container}>
        {/* Screen heading: "What is your taste in music?" */}
        <Text style={styles.heading}>מה הטעם שלכם במוזיקה?</Text>

        {/* --- Scrollable genre grid ---
            FlatList is like a smart map() — it only renders cards that are
            currently visible on screen, which keeps the app fast even with
            many items. `data` is the array of 2-item pairs prepared above. */}
        <FlatList
          style={{ flex: 1 }}
          data={dataInPairs}
          keyExtractor={(_, idx) => `row-${idx}`} // unique key for each row (required by React)
          // renderItem is called once for every [left, right] pair and draws one row
          renderItem={({ item }) => (
            <View style={styles.row}>
              {/* Left card in the row */}
              <GenreCard
                g={item[0]}
                selected={!!item[0] && selected.has(item[0].key)} // true if this genre is in the selected Set
                onPress={() => toggle(item[0]?.key as GenreKey)}
              />

              {/* Right card — or an empty spacer if this row only has one item */}
              {item[1] ? (
                <GenreCard
                  g={item[1]}
                  selected={selected.has(item[1].key)}
                  onPress={() => toggle(item[1]!.key)}
                />
              ) : (
                // Empty View keeps the left card the same width as cards in full rows
                <View style={{ flex: 1 }} />
              )}
            </View>
          )}
          // ListFooterComponent renders below all the cards (inside the scroll area)
          // so the "Finish" button scrolls with the list and is always reachable
          ListFooterComponent={
            <View style={{ paddingTop: 8, paddingBottom: 24 }}>
              {/* --- "Finish" button ---
                  Disabled (and dimmed) until at least one genre is selected. */}
              <Pressable
                onPress={onFinish}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && { opacity: 0.92 }, // slight fade on press
                  selected.size === 0 && { opacity: 0.6 }, // dimmed when nothing is selected
                ]}
                disabled={selected.size === 0} // blocks taps when no genre is selected
                accessibilityRole="button"
                accessibilityLabel="סיום הרשמה"
              >
                <Text style={styles.primaryButtonText}>סיום</Text>
              </Pressable>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 15 }}
          showsVerticalScrollIndicator={false} // hide the scrollbar for a cleaner look
        />
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// GenreCard Component
// Renders a single genre tile: a cover image, a label, and a selected overlay.
//
// Props:
//   g        — the genre data (key, label, image); can be null for empty placeholders
//   selected — whether this card is currently chosen (controls highlight style)
//   onPress  — callback fired when the user taps the card
// ---------------------------------------------------------------------------
function GenreCard({
  g,
  selected,
  onPress,
}: {
  g: GenreItem | null;
  selected: boolean;
  onPress: () => void;
}) {
  // If there's no genre data (odd-count filler slot), render an invisible spacer
  // so the layout stays balanced (left card keeps its half-row width)
  if (!g) return <View style={{ flex: 1 }} />;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected, // highlighted border when selected
        pressed && { transform: [{ scale: 0.995 }] }, // tiny shrink on press for tactile feel
      ]}
      accessibilityRole="checkbox" // screen readers treat this as a multi-select checkbox
      accessibilityState={{ checked: selected }} // tells screen readers whether it's ticked
      accessibilityLabel={`ז'אנר ${g.label}`}
    >
      {/* Image area */}
      <View style={styles.thumbWrap}>
        {/* The genre cover image */}
        <Image source={g.src} style={styles.thumb} resizeMode="cover" />

        {/* Semi-transparent overlay shown on top of the image when the card is selected,
            giving a visual "tinted" effect to indicate the choice */}
        {selected && <View style={styles.thumbOverlay} />}
      </View>

      {/* Genre name label displayed below the image */}
      <Text style={styles.cardLabel}>{g.label}</Text>
    </Pressable>
  );
}
