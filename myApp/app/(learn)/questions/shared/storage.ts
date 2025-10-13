// עטיפה לשימוש ב-AsyncStorage (ב-Expo/React Native) או localStorage בדפדפן.

export type Key = string;

let asyncStore: {
  getItem: (key: Key) => Promise<string | null>;
  setItem: (key: Key, value: string) => Promise<void>;
  removeItem: (key: Key) => Promise<void>;
};

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RNAsyncStorage = require("@react-native-async-storage/async-storage").default;
  if (RNAsyncStorage) {
    asyncStore = RNAsyncStorage;
  } else {
    throw new Error("AsyncStorage not available");
  }
} catch {
  asyncStore = {
    async getItem(key) {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key);
    },
    async setItem(key, value) {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, value);
    },
    async removeItem(key) {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(key);
    },
  };
}

const bucket = (songId?: string) => `@mistakes/${songId ?? "global"}`;

export async function addMistake(m: import("./types").Mistake) {
  const key = bucket(m.songId);
  const raw = (await asyncStore.getItem(key)) || "[]";
  const arr: import("./types").Mistake[] = JSON.parse(raw);
  arr.push(m);
  await asyncStore.setItem(key, JSON.stringify(arr));
}

export async function getMistakes(songId?: string) {
  const key = bucket(songId);
  const raw = (await asyncStore.getItem(key)) || "[]";
  return JSON.parse(raw) as import("./types").Mistake[];
}

export async function clearMistakes(songId?: string) {
  await asyncStore.removeItem(bucket(songId));
}

// AsyncStorage עם נפילה ל-localStorage (ווב)
let store: {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
} = {
  async getItem(k) {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(k);
  },
  async setItem(k, v) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(k, v);
  },
};

try {
  // @react-native-async-storage/async-storage
  const RN = require("@react-native-async-storage/async-storage").default;
  if (RN) store = RN;
} catch {}

export async function saveLyrics(songId: string, lyrics: string) {
  await store.setItem(`@lyrics/${songId}`, lyrics);
}
export async function loadLyrics(songId: string) {
  return (await store.getItem(`@lyrics/${songId}`)) ?? "";
}
export async function saveNewWords(songId: string, words: unknown) {
  await store.setItem(`@newWords/${songId}`, JSON.stringify(words));
}
export async function loadNewWords<T = any[]>(songId: string): Promise<T | null> {
  const raw = await store.getItem(`@newWords/${songId}`);
  return raw ? (JSON.parse(raw) as T) : null;
}
