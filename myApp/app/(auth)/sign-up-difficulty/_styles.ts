// app/(auth)/sign-up-difficulty/styles.ts
import { StyleSheet } from "react-native";

export const COLORS = {
  primary: "#4EC4C4",       // טורקיז־כחלחל
  secondary: "#1A3D5A",     // כחול נייבי כהה
  bgLight: "#F5F7F9",       // אפור־לבן רך
  textDark: "#333333",      // אפור כהה
  accent: "#A8E6CF",        // ירקרק ליים רך
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
    padding: 24,
    gap: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.secondary,
    textAlign: "center",
    marginTop: 115,
    marginBottom: 36,
  },
  cards: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
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
  cardEmoji: {
    fontSize: 22,
    width: 28,
    textAlign: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
    textAlign: "right",
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textDark,
    opacity: 0.9,
    textAlign: "right",
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    marginStart: 8,
  },
  radioOn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.accent,
  },
  radioOff: {
    borderColor: COLORS.secondary,
    backgroundColor: "#FFFFFF",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 22,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default styles;
