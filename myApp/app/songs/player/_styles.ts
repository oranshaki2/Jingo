import { Platform, StyleSheet } from "react-native";

export const LINE_HEIGHT = 64;

const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bg: "#F7FAFC",
  text: "#222",
  textDim: "#4a4a4a",
  activeBg: "#E6FAF7",
  activeText: "#0F766E",
  border: "#e9ecef",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.select({ ios: 16, android: 8 }),
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textDim,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    alignItems: "center",
  },
  controlBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  controlBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryBtnText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  timing: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textDim,
  },
  loadingBox: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    color: COLORS.textDim,
  },
  errorBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    color: "#b00020",
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
  },
  linePressable: {
    borderRadius: 14,
    overflow: "hidden",
  },
  lineBox: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    minHeight: LINE_HEIGHT - 8,
    justifyContent: "center",
  },
  activeLineBox: {
    backgroundColor: COLORS.activeBg,
    borderColor: COLORS.primary,
  },
  lyricEn: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  lyricHe: {
    fontSize: 15,
    color: COLORS.textDim,
  },
  activeLyricEn: {
    color: COLORS.activeText,
  },
  activeLyricHe: {
    color: COLORS.activeText,
  },
  highlightWord: {
    color: "#b00020",
    fontWeight: "700",
  },
  studyButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  studyButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default styles;
