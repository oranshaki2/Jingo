// app/(onboarding)/choose-genres/styles.ts
import { StyleSheet } from "react-native";

export const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bgLight: "#F5F7F9",
  textDark: "#333333",
  accent: "#A8E6CF",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.secondary,
    textAlign: "right",
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
  },
  thumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: COLORS.secondary,
    marginBottom: 8,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.accent,
    opacity: 0.25,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.secondary,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 40,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default styles;
