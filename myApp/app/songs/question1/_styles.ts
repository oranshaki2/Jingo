import { Platform, StyleSheet } from "react-native";

export const COLORS = {
  primary: "#4EC4C4",
  bg: "#F7FAFC",
  text: "#222",
  textDim: "#4a4a4a",
  border: "#e9ecef",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
    justifyContent: "space-between",
  },
  contentContainer: {
    alignItems: "center",
  },
  wordBox: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 24,
    width: "100%",
    marginBottom: 24,
    alignItems: "center",
  },
  wordLabel: {
    fontSize: 14,
    color: COLORS.textDim,
  },
  word: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.primary,
  },
  questionBox: {
    backgroundColor: "#F0F8F8",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 24,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "right",
  },
  optionsContainer: {
    width: "100%",
    gap: 12,
  },
  optionButton: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: "center",
  },
  selectedOption: {
    borderColor: COLORS.primary,
    backgroundColor: "#E6FAF7",
  },
  correctOption: {
    backgroundColor: "#D1FAE5",
    borderColor: "#10B981",
  },
  wrongOption: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
  },
  optionText: {
    fontSize: 16,
  },
  correctText: {
    color: "#10B981",
    fontWeight: "700",
  },
  wrongText: {
    color: "#EF4444",
    fontWeight: "700",
  },
  buttonContainer: {
    gap: 12,
    marginBottom: Platform.OS === "ios" ? 32 : 24,
  },
  checkButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textDim,
  },
  errorText: {
    color: "#b00020",
    textAlign: "center",
  },
});

export default styles;
