import { Platform, StyleSheet } from "react-native";

export const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bg: "#F7FAFC",
  text: "#222",
  textDim: "#4a4a4a",
  error: "#EF4444",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingVertical: 24,
    justifyContent: "space-between",
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingBottom: 16,
  },
  headerBox: {
    marginBottom: 24,
    alignItems: "center",
  },
  headerEmoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 18,
    color: COLORS.textDim,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 32,
  },
  suggestionsBox: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  suggestionsText: {
    fontSize: 16,
    color: COLORS.textDim,
    textAlign: "center",
  },
  list: {
    width: "100%",
    gap: 12,
  },
  listItem: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  songImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  songArtist: {
    fontSize: 14,
    color: COLORS.textDim,
    marginTop: 4,
  },
  songGenre: {
    fontSize: 13,
    color: COLORS.secondary,
    marginTop: 4,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: Platform.OS === "ios" ? 32 : 24,
  },
  homeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default styles;
