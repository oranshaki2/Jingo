// app/index.tsx
// This is the app's entry point — the very first file that runs when the app opens.
// Its only job is to decide where to send the user:
//   - If a saved login token is found  → go directly to the Home screen (already logged in)
//   - If no token is found             → go to the Landing screen (needs to sign in / sign up)
//   - If something goes wrong          → fall back safely to the Landing screen
//
// The user never actually "sees" this screen; it just shows a spinner while
// the check is running and then redirects immediately.

// useEffect = run code once after the component first appears on screen
// useState  = track whether the auth check is still in progress
import { useEffect, useState } from "react";

// View            = invisible layout box used to centre the spinner
// ActivityIndicator = the spinning loading indicator shown while checking auth
import { View, ActivityIndicator } from "react-native";

// router lets us programmatically navigate the user to a different screen
import { router } from "expo-router";

// SecureStore reads and writes encrypted data on the device.
// We use it here to check whether an auth token was saved from a previous login.
import * as SecureStore from "expo-secure-store";

// ---------------------------------------------------------------------------
// Index Component
// The silent "gatekeeper" of the app.
// It checks whether the user is already logged in (has a stored token)
// and immediately redirects them to the right place.
// ---------------------------------------------------------------------------
export default function Index() {
  // isLoading = true while the token check is running, false once it's done.
  // While loading we show a spinner; after that we redirect (so the spinner
  // disappears and the new screen takes over).
  const [isLoading, setIsLoading] = useState(true);

  // useEffect with an empty [] dependency array means this runs exactly once —
  // right after the component is first rendered on screen.
  useEffect(() => {
    // Inner async function so we can use await inside useEffect
    const checkAuth = async () => {
      try {
        // Look up the auth token that was saved when the user last logged in.
        // Returns the token string if it exists, or null if nothing is stored.
        const token = await SecureStore.getItemAsync("auth_token");

        if (token) {
          // A token exists → the user is already logged in.
          // Send them straight to the main Home screen, skipping login entirely.
          router.replace("/(tabs)/home");
        } else {
          // No token found → the user hasn't logged in yet (or logged out).
          // Send them to the Landing screen where they can sign in or register.
          router.replace("/landing-screen");
        }
      } catch (error) {
        // Something unexpected went wrong while reading from SecureStore
        // (e.g. device storage error). Log it for debugging and fall back
        // to the Landing screen so the user can still sign in normally.
        console.error("Auth check failed:", error);
        router.replace("/landing-screen");
      } finally {
        // Always runs after try/catch — mark loading as done so the spinner stops.
        // (In practice the redirect has already happened, but this keeps state clean.)
        setIsLoading(false);
      }
    };

    // Kick off the auth check as soon as the component mounts
    checkAuth();
  }, []); // empty array = run only once on mount, not on every re-render

  // ---------------------------------------------------------------------------
  // Render — what the user briefly sees while the auth check is running
  // ---------------------------------------------------------------------------
  return (
    // Full-screen centred container for the spinner
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      {isLoading ? (
        // Show a spinning loading indicator while the token check is in progress
        <ActivityIndicator />
      ) : (
        // Once the check is done the redirect has already fired, so this
        // empty View is just a safe fallback placeholder that is never visible.
        <View>{/* Render content after auth check */}</View>
      )}
    </View>
  );
}
