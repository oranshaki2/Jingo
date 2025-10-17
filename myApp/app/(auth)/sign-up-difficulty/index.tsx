// app/(auth)/sign-up-difficulty/index.tsx
import React, { useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { Stack, router, Href } from "expo-router";
import { saveSignupData } from "../../../utils/storage";
import styles from "./_styles";

type Difficulty = 1 | 2 | 3;

export default function SignUpDifficulty() {
  const [level, setLevel] = useState<Difficulty | null>(null);

  const goNext = async () => {
    if (!level) {
      Alert.alert("בחרו רמה", "אנא בחרו אחת מהאפשרויות כדי להמשיך.");
      return;
    }
    await saveSignupData("level", level);
    router.push({ pathname: "/(auth)/choose-genres", params: { level: String(level) } } as Href);
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
      <View style={[styles.radio, selected ? styles.radioOn : styles.radioOff]} />
    </Pressable>
  );
}
