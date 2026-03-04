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
  textInput: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 50,
    width: "100%",
    marginBottom: 24,
    textAlign: "center",
  },
  correctInput: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  wrongInput: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
  },
  correctFeedback: {
    color: COLORS.success,
  },
  wrongFeedback: {
    color: COLORS.error,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: Platform.OS === "ios" ? 32 : 24,
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
});

export default styles;
