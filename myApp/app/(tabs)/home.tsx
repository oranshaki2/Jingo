// app/(tabs)/home.tsx
import React from "react";
import { View, Text, Image, Pressable, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";

const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bgLight: "#F5F7F9",
  textDark: "#333333",
  accent: "#A8E6CF",
};

type CatKey =
  | "Animals" | "Transport" | "Sports" | "Emotions"
  | "Family" | "Body Parts" | "Food" | "Clothing";

type Category = { key: CatKey; label: string; src: any };

const CATEGORIES: Category[] = [
  { key: "Animals",   label: "חיות",      src: require("../../assets/categories/animals.jpg") },
  { key: "Transport", label: "תחבורה",    src: require("../../assets/categories/transport.jpg") },
  { key: "Sports",    label: "ספורט",     src: require("../../assets/categories/sports.jpg") },
  { key: "Emotions",  label: "רגשות",     src: require("../../assets/categories/emotions.jpg") },
  { key: "Family",    label: "משפחה",     src: require("../../assets/categories/family.jpg") },
  { key: "Body Parts",      label: "איברי גוף", src: require("../../assets/categories/body.jpg") },
  { key: "Food",      label: "אוכל",      src: require("../../assets/categories/food.jpg") },
  { key: "Clothing",  label: "הלבשה",     src: require("../../assets/categories/clothing.jpg") },
];

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bgLight }}>
        {/* פס עליון עם פרופיל */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.push("/(tabs)/settings")}
            style={styles.profileBtn}
            accessibilityRole="button"
            accessibilityLabel="פרופיל - מעבר להגדרות פרופיל"
          >
            <Image
              source={require("../../assets/images/avatar.png")}
              style={styles.avatar}
            />
            <Text style={styles.profileText}>פרופיל</Text>
          </Pressable>
        </View>

        {/* כותרת */}
        <Text style={styles.heading}>מאיזו קטגוריה נלמד עכשיו?</Text>

        {/* רשת קטגוריות */}
        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item.key}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(learn)/category/[cat]",
                  params: { cat: item.key }, // <--- ניווט דינמי בטוח טיפוסית
                })
              }
              style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.995 }] }]}
              accessibilityRole="button"
              accessibilityLabel={`כניסה לקטגוריה ${item.label}`}
            >
              <View style={styles.thumbWrap}>
                <Image source={item.src} style={styles.thumb} resizeMode="cover" />
              </View>
              <Text style={styles.cardLabel}>{item.label}</Text>
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: COLORS.bgLight,
  },
  profileBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    padding: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: "#FFF",
  },
  profileText: {
    color: COLORS.secondary,
    fontWeight: "700",
    fontSize: 15,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.secondary,
    textAlign: "right",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  thumbWrap: {
    width: "100%",
    aspectRatio: 1.3,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.secondary,
    textAlign: "center",
  },
});