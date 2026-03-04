// app/(auth)/sign-up/styles.ts
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
    padding: 24,
    flex: 1,
    backgroundColor: COLORS.bgLight,
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 24,
    textAlign: "right",
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    color: COLORS.secondary,
    marginBottom: 6,
    textAlign: "right",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: COLORS.textDark,
  },
  passwordWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  eyeIcon: {
    width: 22,
    height: 22,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  imageButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: COLORS.secondary,
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButtonOutline: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  secondaryButtonOutlineText: {
    color: COLORS.secondary,
    fontWeight: "600",
    fontSize: 14,
  },
  imageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: "#FFF",
  },
  clearThumb: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  clearThumbText: {
    color: COLORS.secondary,
    fontWeight: "600",
  },
  linkWrapper: {
    marginTop: 14,
    alignItems: "center",
  },
  linkText: {
    color: COLORS.textDark,
    fontSize: 14,
  },
  linkEmph: {
    color: COLORS.accent,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});

export default styles;
