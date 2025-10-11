// app/(onboarding)/choose-genres.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Image, StyleSheet, Alert, FlatList } from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { loadSignupData, clearSignupData } from "../../utils/storage";



const COLORS = {
  primary: "#4EC4C4",      
  secondary: "#1A3D5A",     
  bgLight: "#F5F7F9",       
  textDark: "#333333",   
  accent: "#A8E6CF",       
};

type GenreKey =
  | "rock" | "pop" | "rnb" | "hiphop" | "metal" | "jazz"
  | "folk" | "electronic" | "country" | "indie" | "kids";

type GenreItem = { key: GenreKey; label: string; src: any };

const GENRES: GenreItem[] = [
  { key: "rock",        label: "רוק",              src: require("../../assets/genres/rock.jpg") },
  { key: "pop",         label: "פופ",              src: require("../../assets/genres/pop.jpg") },
  { key: "rnb",         label: "רית'ם אנד בלוז",  src: require("../../assets/genres/rnb.jpg") },
  { key: "hiphop",      label: "היפ-הופ",         src: require("../../assets/genres/hiphop.jpg") },
  { key: "metal",       label: "מטאל",            src: require("../../assets/genres/metal.jpg") },
  { key: "jazz",        label: "ג'אז",            src: require("../../assets/genres/jazz.jpg") },
  { key: "folk",        label: "פולק",            src: require("../../assets/genres/folk.jpg") },
  { key: "electronic",  label: "אלקטרוני",        src: require("../../assets/genres/electronic.jpg") },
  { key: "country",     label: "קאנטרי",          src: require("../../assets/genres/country.jpg") },
  { key: "indie",       label: "אינדי",           src: require("../../assets/genres/indie.jpg") },
  { key: "kids",        label: "ילדים",           src: require("../../assets/genres/kids.jpg") },
];

export default function ChooseGenres() {
  const [selected, setSelected] = useState<Set<GenreKey>>(new Set());

  const dataInPairs = useMemo(() => {
    // arrange genres in pairs for two-column layout
    const pairs: (GenreItem | null)[][] = [];
    for (let i = 0; i < GENRES.length; i += 2) {
      pairs.push([GENRES[i], GENRES[i + 1] ?? null]);
    }
    return pairs;
  }, []);

  const toggle = (key?: GenreKey) => {
    if (!key) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };


  const onFinish = async () => {
  if (selected.size === 0) {
    Alert.alert("בחירת ז'אנרים", "אנא בחרו לפחות ז'אנר אחד כדי להמשיך.");
    return;
  }
 
  try {
    
    // get saved signup data
    const username = await loadSignupData<string>("username");
    const password = await loadSignupData<string>("password");
    const level = await loadSignupData<number>("level"); // 1| 2 | 3
    const picture = await loadSignupData<string | null>("picture"); 
    const genres = Array.from(selected);

    if (!username || !password || !level) {
      Alert.alert("שגיאה", "פרטי ההרשמה חסרים. התחילו מחדש.");
      return;
    }
    //debug to delete later
    console.log("Submitting signup data:", { username, password, level, genres, picture });

    const API_URL = process.env.EXPO_PUBLIC_API_URL!;
    const res = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        picture,
        level,
        genres,
      }),
    });

    if (!res.ok) throw new Error("הרשמה נכשלה");

    await clearSignupData(); 

    router.replace("/(tabs)/home");
  
  } catch (e) {
    Alert.alert("שגיאה", "אירעה שגיאה בהרשמה. נסו שוב.");
    console.error(e);
  }
};

  return (
    <>
      <Stack.Screen
        options={{
          title: "בחירת ז'אנרים",
          headerBackTitle: "חזור",
        }}
      />
      <View style={styles.container}>
        <Text style={styles.heading}>מה הטעם שלכם במוזיקה?</Text>

        <FlatList
          style={{ flex: 1 }}
          data={dataInPairs}
          keyExtractor={(_, idx) => `row-${idx}`}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <GenreCard g={item[0]} selected={selected.has(item[0]?.key as GenreKey)} onPress={() => toggle(item[0]?.key as GenreKey)} />
              {item[1] ? (
                <GenreCard g={item[1]} selected={selected.has(item[1].key)} onPress={() => toggle(item[1]?.key as GenreKey)} />
              ) : (
                <View style={{ flex: 1 }} />
              )}
            </View>
          )}
          ListFooterComponent={
            <View style={{ paddingTop: 8, paddingBottom: 24 }}>
              <Pressable
                onPress={onFinish}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && { opacity: 0.92 },
                  selected.size === 0 && { opacity: 0.6 },
                ]}
                disabled={selected.size === 0}
                accessibilityRole="button"
                accessibilityLabel="סיום הרשמה"
              >
                <Text style={styles.primaryButtonText}>סיום</Text>
              </Pressable>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 15 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </>
  );
}

function GenreCard({
  g,
  selected,
  onPress,
}: {
  g: GenreItem | null;
  selected: boolean;
  onPress: () => void;
}) {
  if (!g) return <View style={{ flex: 1 }} />;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && { transform: [{ scale: 0.995 }] },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`ז'אנר ${g.label}`}
    >
      <View style={styles.thumbWrap}>
        <Image source={g.src} style={styles.thumb} resizeMode="cover" />
        {selected && <View style={styles.thumbOverlay} />}
      </View>
      <Text style={styles.cardLabel}>{g.label}</Text>
    </Pressable>
  );
}

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