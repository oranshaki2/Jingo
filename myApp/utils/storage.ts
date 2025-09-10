// utils/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function saveSignupData(key: string, value: any) {
  try {
    const json = JSON.stringify(value);
    await AsyncStorage.setItem(`signup_${key}`, json);
  } catch (e) {
    console.error("Failed to save signup data:", key, e);
  }
}

export async function loadSignupData<T = any>(key: string): Promise<T | null> {
  try {
    const json = await AsyncStorage.getItem(`signup_${key}`);
    return json ? (JSON.parse(json) as T) : null;
  } catch (e) {
    console.error("Failed to load signup data:", key, e);
    return null;
  }
}

export async function clearSignupData() {
  const keys = await AsyncStorage.getAllKeys();
  const signupKeys = keys.filter((k) => k.startsWith("signup_"));
  await AsyncStorage.multiRemove(signupKeys);
}
