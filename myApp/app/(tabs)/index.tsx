// // app/(tabs)/index.tsx
import { View, Text } from 'react-native';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>ברוכה הבאה לאפליקציה!</Text>
      
      {/* פה הלינק להרשמה */}
      <Link href="/sign-up" style={{ marginTop: 20, color: 'blue' }}>
        להרשמה
      </Link>
    </View>
  );
}