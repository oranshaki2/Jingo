// app/(tabs)/home.tsx
import React, { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, FlatList, Modal, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { LogOut } from "lucide-react-native"; // ← אייקון יציאה

const COLORS = {
  primary: "#4EC4C4",
  secondary: "#1A3D5A",
  bgLight: "#F5F7F9",
  textDark: "#333333",
  accent: "#A8E6CF",
};

type CatKey =
  | "Animals"
  | "Transport"
  | "Sports"
  | "Emotions"
  | "Family"
  | "Body Parts"
  | "Food"
  | "Clothing";

type Category = { key: CatKey; label: string; src: any };

const CATEGORIES: Category[] = [
  { key: "Animals", label: "חיות", src: require("../../assets/categories/animals.jpg") },
  { key: "Transport", label: "תחבורה", src: require("../../assets/categories/transport.jpg") },
  { key: "Sports", label: "ספורט", src: require("../../assets/categories/sports.jpg") },
  { key: "Emotions", label: "רגשות", src: require("../../assets/categories/emotions.jpg") },
  { key: "Family", label: "משפחה", src: require("../../assets/categories/family.jpg") },
  { key: "Body Parts", label: "איברי גוף", src: require("../../assets/categories/body.jpg") },
  { key: "Food", label: "אוכל", src: require("../../assets/categories/food.jpg") },
  { key: "Clothing", label: "הלבשה", src: require("../../assets/categories/clothing.jpg") },
];

export default function Home() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bgLight }}>
        {/* פס עליון */}
        <View style={styles.topBar}>
          {/* כפתור התנתקות בצד שמאל */}
          <Pressable
            onPress={async () => {
              try {
                await SecureStore.deleteItemAsync("auth_token");
                router.replace("/landing-screen");
              } catch (error) {
                console.error("Sign-out error:", error);
              }
            }}
            style={styles.logoutBtn}
            accessibilityRole="button"
            accessibilityLabel="התנתקות מהמערכת"
          >
            <LogOut size={26} color={COLORS.secondary} />
          </Pressable>

          {/* תמונת פרופיל בצד ימין */}
          <Pressable
            onPress={() => setModalVisible(true)}
            accessibilityRole="imagebutton"
            accessibilityLabel="תמונת פרופיל - להצגה מוגדלת"
          >
            <Image
              source={require("../../assets/images/avatar.png")}
              style={styles.avatar}
            />
          </Pressable>

          {/* Modal להצגת תמונה מוגדלת */}
          <Modal
            visible={modalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.8)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  position: "absolute",
                  top: 40,
                  right: 20,
                  backgroundColor: "#fff",
                  borderRadius: 20,
                  padding: 8,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "bold" }}>✕</Text>
              </TouchableOpacity>

              <Image
                source={require("../../assets/images/avatar.png")}
                style={{ width: 250, height: 250, borderRadius: 125 }}
                resizeMode="cover"
              />
            </View>
          </Modal>
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
                  params: { cat: item.key },
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
    justifyContent: "space-between", // תמונה מימין, כפתור משמאל
    alignItems: "center",
    backgroundColor: COLORS.bgLight,
  },
  logoutBtn: {
    padding: 6,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: "#FFF",
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