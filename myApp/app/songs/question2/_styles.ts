import { Platform, StyleSheet } from "react-native";

export const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bg: "#F7FAFC",
  text: "#222",
  textDim: "#4a4a4a",
  border: "#e9ecef",
  success: "#22c55e",
  error: "#ef4444",
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 32,
  },
  wordBox: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 24,
    width: "100%",
    marginBottom: 32,
    alignItems: "center",
  },
  wordLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDim,
    marginBottom: 8,
  },
  word: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.primary,
  },
  description: {
    fontSize: 16,
    color: COLORS.textDim,
    textAlign: "center",
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: Platform.OS === "ios" ? 32 : 24,
  },
  continueButton: {
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
  loadingText: {
    marginTop: 12,
    color: COLORS.textDim,
    fontSize: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  questionBox: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 16,
    textAlign: "center",
  },
  sentenceBox: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 16,
    marginBottom: 24,
    minHeight: 80,
    justifyContent: "center",
  },
  sentenceText: {
    fontSize: 18,
    color: COLORS.text,
    lineHeight: 28,
    textAlign: "center",
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionButton: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 50,
    justifyContent: "center",
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
    fontWeight: "500",
  },
  selectedOption: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  selectedText: {
    color: "white",
  },
  correctOption: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  correctText: {
    color: "white",
  },
  wrongOption: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  wrongText: {
    color: "white",
  },
  checkButton: {
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
});

export default styles;
