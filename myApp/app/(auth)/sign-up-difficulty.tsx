// app/(auth)/sign-up-difficulty.tsx
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { Stack, router } from "expo-router";
import { saveSignupData } from "../../utils/storage";

const COLORS = {
  primary: "#4EC4C4",       // טורקיז־כחלחל
  secondary: "#1A3D5A",     // כחול נייבי כהה
  bgLight: "#F5F7F9",       // אפור־לבן רך
  textDark: "#333333",      // אפור כהה
  accent: "#A8E6CF",        // ירקרק ליים רך
};

type Difficulty = 1 | 2 | 3;;

export default function SignUpDifficulty() {
  const [level, setLevel] = useState<Difficulty | null>(null);

  const goNext = async () => {
    if (!level) {
      Alert.alert("בחרו רמה", "אנא בחרו אחת מהאפשרויות כדי להמשיך.");
      return;
    }
    await saveSignupData("level", level);
    router.push({
      pathname: "/(auth)/choose-genres",
      params: { level },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "בחירת רמת קושי",
          headerBackTitle: "חזור",
        }}
      />

      <View style={styles.container}>
        <Text style={styles.title}>בחרו רמה שמתאימה לכם</Text>

        <View style={styles.cards}>
          <OptionCard
            emoji="🟢"
            title="קל"
            subtitle="מתאים למתחילים"
            selected={level === 1}
            onPress={() => setLevel(1)}
          />
          <OptionCard
            emoji="🟡"
            title="בינוני"
            subtitle="עם קצת ניסיון"
            selected={level === 2}
            onPress={() => setLevel(2)}
          />
          <OptionCard
            emoji="🔴"
            title="קשה"
            subtitle="לרמה מתקדמת"
            selected={level === 3}
            onPress={() => setLevel(3)}
          />
        </View>

        <Pressable
          onPress={goNext}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && { opacity: 0.92 },
            !level && { opacity: 0.6 },
          ]}
          disabled={!level}
          accessibilityRole="button"
          accessibilityLabel="המשך"
        >
          <Text style={styles.primaryButtonText}>המשך</Text>
        </Pressable>
      </View>
    </>
  );
}

function OptionCard({
  emoji,
  title,
  subtitle,
  selected,
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && { transform: [{ scale: 0.995 }] },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title} - ${subtitle}`}
    >
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <View
        style={[
          styles.radio,
          selected ? styles.radioOn : styles.radioOff,
        ]}
      />
    </Pressable>
  );
}

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