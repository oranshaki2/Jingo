import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

export default function CategoryScreen() {
  const { cat } = useLocalSearchParams<{ cat: string }>();

  return (
    <Text>את/ה עכשיו בתוך קטגוריה: {cat}</Text>
  );
}