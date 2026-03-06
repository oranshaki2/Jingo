// app/(tabs)/home.tsx
// This is the main Home screen — the first screen users see after logging in.
// It shows a grid of vocabulary category cards (Animals, Food, Sports, etc.).
// Tapping a card takes the user into a learning session for that category.
//
// The screen also has a top bar with:
//   - A logout button (top-left) that clears the auth token and returns to Landing
//   - A profile picture (top-right) that opens a larger preview in a popup

// React core + hooks:
// useEffect = run code once when the screen loads
// useState  = track pieces of changing data (modal open/closed, user id)
import React, { useEffect, useState } from "react";

// UI primitives from React Native:
// View           = layout box                FlatList = efficient scrollable grid
// Text           = text label                Modal    = full-screen overlay/popup
// Image          = picture                   TouchableOpacity = tappable with fade
// Pressable      = tappable element          StyleSheet = creates optimised style objects
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  FlatList,
  Modal,
  TouchableOpacity,
} from "react-native";

// SafeAreaView adds padding so content doesn't overlap the device's notch/status-bar
import { SafeAreaView } from "react-native-safe-area-context";

// Stack lets us configure the navigation header for this specific screen
import { Stack } from "expo-router";

// SecureStore reads/writes encrypted data on the device (we use it to
// retrieve the stored user ID and to delete the auth token on logout)
import * as SecureStore from "expo-secure-store";

// useRouter gives us the `router` object for navigating between screens
import { useRouter } from "expo-router";

// LogOut is a pre-built icon from the lucide icon library
import { LogOut } from "lucide-react-native";

// ---------------------------------------------------------------------------
// COLORS — a central palette used throughout this screen.
// Keeping colors here (instead of scattered inline) makes it easy to update
// the look of the whole screen by changing a single value.
// ---------------------------------------------------------------------------
const COLORS = {
  primary: "#4EC4C4", // teal — used for borders and highlights
  secondary: "#1A3D5A", // dark navy — used for text and icons
  bgLight: "#F5F7F9", // very light grey — screen background
  textDark: "#333333", // near-black — general text colour
  accent: "#A8E6CF", // soft mint green — top-bar background
};

// ---------------------------------------------------------------------------
// Type: CatKey
// A strict list of all valid category identifiers.
// TypeScript will catch any typos involving these names at compile time.
// ---------------------------------------------------------------------------
type CatKey =
  | "Animals"
  | "Transport"
  | "Sports"
  | "Emotions"
  | "Family"
  | "Body Parts"
  | "Food"
  | "Clothing";

// ---------------------------------------------------------------------------
// Type: Category
// Describes one entry in the categories grid:
//   key   = internal identifier (passed to the learning screen as a route param)
//   label = display name shown on the card (in Hebrew)
//   src   = the cover image file for the card
// ---------------------------------------------------------------------------
type Category = { key: CatKey; label: string; src: any };

// ---------------------------------------------------------------------------
// CATEGORIES — the full list of vocabulary categories shown in the grid.
// Adding a new category here is all that's needed to show it on the home screen.
// ---------------------------------------------------------------------------
const CATEGORIES: Category[] = [
  {
    key: "Animals",
    label: "חיות",
    src: require("../../assets/categories/animals.jpg"),
  },
  {
    key: "Transport",
    label: "תחבורה",
    src: require("../../assets/categories/transport.jpg"),
  },
  {
    key: "Sports",
    label: "ספורט",
    src: require("../../assets/categories/sports.jpg"),
  },
  {
    key: "Emotions",
    label: "רגשות",
    src: require("../../assets/categories/emotions.jpg"),
  },
  {
    key: "Family",
    label: "משפחה",
    src: require("../../assets/categories/family.jpg"),
  },
  {
    key: "Body Parts",
    label: "איברי גוף",
    src: require("../../assets/categories/body.jpg"),
  },
  {
    key: "Food",
    label: "אוכל",
    src: require("../../assets/categories/food.jpg"),
  },
  {
    key: "Clothing",
    label: "הלבשה",
    src: require("../../assets/categories/clothing.jpg"),
  },
];

// ---------------------------------------------------------------------------
// Home Component
// The main screen after login. Renders the category grid and top bar.
// ---------------------------------------------------------------------------
export default function Home() {
  // router lets us navigate to other screens programmatically
  const router = useRouter();

  // modalVisible controls whether the enlarged profile-picture popup is open
  const [modalVisible, setModalVisible] = useState(false);

  // userId = the logged-in user's ID, loaded from secure storage.
  // It's passed to the learning screen so the server knows whose progress to track.
  const [userId, setUserId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load the user's ID from secure storage when the screen first mounts.
  // The empty [] means this runs exactly once — not on every re-render.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const getUserId = async () => {
      try {
        // Retrieve the user_id that was saved during the sign-in flow
        const id = await SecureStore.getItemAsync("user_id");
        setUserId(id); // store it in state so it can be passed to navigation calls
      } catch (error) {
        console.error("Failed to retrieve user_id:", error);
      }
    };
    getUserId();
  }, []);

  // ---------------------------------------------------------------------------
  // Render — what the screen looks like
  // ---------------------------------------------------------------------------
  return (
    // Fragment wraps the Stack.Screen config and the screen body together
    <>
      {/* Hide the default back arrow — users shouldn't go "back" to the login screen */}
      <Stack.Screen options={{ headerBackVisible: false }} />

      {/* SafeAreaView avoids overlap with left/right device edges (notch, rounded corners) */}
      <SafeAreaView
        edges={["left", "right"]}
        style={{ flex: 1, backgroundColor: COLORS.bgLight }}
      >
        {/* ----------------------------------------------------------------
            TOP BAR
            A horizontal strip with the logout button on the left and the
            profile picture on the right.
        ---------------------------------------------------------------- */}
        <View style={styles.topBar}>
          {/* --- Logout button (left side) ---
              Tapping it deletes the stored auth token and sends the user
              back to the Landing screen, effectively logging them out. */}
          <Pressable
            onPress={async () => {
              try {
                // Remove the auth token so the app treats the user as logged out
                await SecureStore.deleteItemAsync("auth_token");
                // Navigate back to the landing screen (replacing history so
                // they can't press back to get back to the home screen)
                router.replace("/landing-screen");
              } catch (error) {
                console.error("Sign-out error:", error);
              }
            }}
            style={styles.logoutBtn}
            accessibilityRole="button"
            accessibilityLabel="התנתקות מהמערכת"
          >
            {/* Logout icon from the lucide icon library */}
            <LogOut size={26} color={COLORS.secondary} />
          </Pressable>

          {/* --- Profile picture (right side) ---
              Tapping it opens a Modal with a larger version of the image. */}
          <Pressable
            onPress={() => setModalVisible(true)} // open the enlarged-photo popup
            accessibilityRole="imagebutton"
            accessibilityLabel="תמונת פרופיל - להצגה מוגדלת"
          >
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.avatar}
            />
          </Pressable>

          {/* --- Profile picture modal (enlarged popup) ---
              Appears as a dark full-screen overlay with a large circular photo.
              The user closes it by tapping the ✕ button or pressing Back. */}
          <Modal
            visible={modalVisible} // controlled by the modalVisible state
            transparent={true} // keeps the content below partially visible through the dark overlay
            animationType="fade" // smooth fade-in/fade-out transition
            onRequestClose={() => setModalVisible(false)} // handles Android hardware back button
          >
            {/* Dark semi-transparent backdrop that fills the whole screen */}
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.8)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* Close button in the top-right corner of the overlay */}
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  position: "absolute",
                  top: 40,
                  right: 20,
                  backgroundColor: "#fff",
                  borderRadius: 20,
                  padding: 8,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "bold" }}>✕</Text>
              </TouchableOpacity>

              {/* Large circular profile picture centred on the overlay */}
              <Image
                source={require("../../assets/images/icon.png")}
                style={{ width: 250, height: 250, borderRadius: 125 }}
                resizeMode="cover"
              />
            </View>
          </Modal>
        </View>
        {/* END TOP BAR */}

        {/* Section heading: "Which category shall we learn now?" */}
        <Text style={styles.heading}>מאיזו קטגוריה נלמד עכשיו?</Text>

        {/* ----------------------------------------------------------------
            CATEGORY GRID
            FlatList renders the CATEGORIES array as a 2-column scrollable grid.
            It only renders cards that are currently visible on screen,
            keeping the app fast regardless of how many categories there are.
        ---------------------------------------------------------------- */}
        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item.key} // unique key for each card (required by React)
          numColumns={2} // display two cards per row
          columnWrapperStyle={{ gap: 12 }} // horizontal gap between the two cards in a row
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          renderItem={({ item }) => (
            // Each card is a tappable Pressable that navigates to the learning screen
            <Pressable
              onPress={() =>
                router.push({
                  // Navigate to the dynamic category route, passing the category key
                  // and the userId so the learning screen knows what to load and for whom
                  pathname: "/(learn)/category/[cat]",
                  params: { cat: item.key, userId },
                })
              }
              style={({ pressed }) => [
                styles.card,
                pressed && { transform: [{ scale: 0.995 }] }, // tiny shrink on press
              ]}
              accessibilityRole="button"
              accessibilityLabel={`כניסה לקטגוריה ${item.label}`}
            >
              {/* Category cover image */}
              <View style={styles.thumbWrap}>
                <Image
                  source={item.src}
                  style={styles.thumb}
                  resizeMode="cover"
                />
              </View>

              {/* Category name label below the image */}
              <Text style={styles.cardLabel}>{item.label}</Text>
            </Pressable>
          )}
          showsVerticalScrollIndicator={false} // hide the scrollbar for a cleaner look
        />
      </SafeAreaView>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// StyleSheet.create compiles the styles once at startup for better performance.
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  // The horizontal strip at the top of the screen
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between", // logout on left, avatar on right
    alignItems: "center",
    backgroundColor: COLORS.accent,
  },

  // Padding around the logout icon so it's easier to tap
  logoutBtn: {
    padding: 6,
  },

  // Small circular profile picture in the top bar
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 999, // large value = perfect circle regardless of size
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: "#FFF",
  },

  // The "which category?" heading above the grid
  heading: {
    paddingTop: 12,
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.secondary,
    textAlign: "right", // right-to-left for Hebrew
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  // Individual category card (one cell in the 2-column grid)
  card: {
    flex: 1, // each card takes exactly half the row width
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },

  // Container for the card's cover image — enforces a fixed aspect ratio
  thumbWrap: {
    width: "100%",
    aspectRatio: 1.3, // width is 1.3× the height
    borderRadius: 12,
    overflow: "hidden", // clips the image to the rounded corners
    marginBottom: 8,
  },

  // The cover image itself, fills its container completely
  thumb: {
    width: "100%",
    height: "100%",
  },

  // Category name label displayed below the image
  cardLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.secondary,
    textAlign: "center",
  },
});
