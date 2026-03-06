// app/_layout.tsx
// This is the ROOT layout of the entire app.
// In Expo Router every file called _layout.tsx wraps all the screens
// that live in the same folder (and subfolders) — think of it as a
// "frame" that surrounds every screen.
//
// This root layout is responsible for three things:
//   1. Loading custom fonts before anything is shown on screen.
//   2. Applying the correct light or dark colour theme app-wide.
//   3. Defining the top-level navigation stack (which screens exist at the root level).

// ThemeProvider = wraps the whole app so every screen shares the same colour theme
// DarkTheme     = the built-in dark theme (dark backgrounds, light text)
// DefaultTheme  = the built-in light theme (light backgrounds, dark text)
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

// useFonts = a hook that loads custom font files before the app renders
import { useFonts } from "expo-font";

// Stack = the navigation container that manages a "stack" of screens
// (like a pile of cards — pushing adds a screen on top, going back removes it)
import { Stack } from "expo-router";

// StatusBar = the thin bar at the very top of the device showing time, battery, etc.
// "auto" style means it automatically picks light or dark text to contrast the background
import { StatusBar } from "expo-status-bar";

// Side-effect import: sets up the Reanimated animation library.
// No export is used from it — just importing it is enough to initialise it.
import "react-native-reanimated";

// useColorScheme detects whether the user's device is set to Light or Dark mode
import { useColorScheme } from "@/hooks/useColorScheme";

// ---------------------------------------------------------------------------
// RootLayout Component
// The outermost wrapper of the entire app.
// It renders exactly once and stays alive for the whole session.
// ---------------------------------------------------------------------------
export default function RootLayout() {
  // Detect the device's current colour preference: "light" | "dark" | null
  const colorScheme = useColorScheme();

  // Load the custom SpaceMono font from the local assets folder.
  // `loaded` is false while the font is still being read from disk,
  // and becomes true once it's ready to use.
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Don't render anything until the font is fully loaded.
  // Returning null shows a blank screen for the fraction of a second
  // it takes to load — this prevents text from flashing in the wrong font.
  // (In production builds fonts are bundled, so this is nearly instant.)
  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    // ThemeProvider makes the chosen theme available to every screen in the app.
    // If the device is in dark mode, use DarkTheme; otherwise use DefaultTheme (light).
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      {/* Stack defines the root-level navigation.
          initialRouteName sets which screen shows first — here it's the Landing screen.
          All other screens (auth flow, tabs, etc.) are discovered automatically
          by Expo Router from the folder structure; only screens that need
          special options (like hiding the header) need to be listed here. */}
      <Stack initialRouteName="landing-screen/index">
        {/* The Landing screen gets the navigation header hidden because it has
            its own custom design with no back button needed. */}
        <Stack.Screen
          name="landing-screen/index"
          options={{ headerShown: false }}
        />
      </Stack>

      {/* StatusBar sits outside Stack so it overlays every screen.
          style="auto" lets the OS pick the right text colour automatically. */}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
