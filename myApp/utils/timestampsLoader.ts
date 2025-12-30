/**
 * Timestamps loader for React Native
 * Loads pre-processed timestamp files from myApp/assets/timestamps/
 */

type TimestampsData = {
  file: string;
  lineCount: number;
  timestamps: number[];
};

/**
 * Normalize song title to match the asset filename
 * e.g., "You Belong With Me" -> "you_belong_with_me"
 */
function normalizeTitleForAsset(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");
}

/**
 * Load timestamps JSON from assets
 * Returns the timestamps array, or empty array if not found
 */
export function loadTimestampsAsset(songTitle: string): number[] {
  try {
    const normalized = normalizeTitleForAsset(songTitle);
    
    // Dynamic require of the JSON file
    // This works at build time with Metro bundler
    const assetMap: { [key: string]: TimestampsData } = {
      "all_too_well": require("@/assets/timestamps/taylor_swift_-_all_too_well.json"),
      "you_belong_with_me": require("@/assets/timestamps/taylor_swift-_you_belong_with_me.json"),
      "roar": require("@/assets/timestamps/katy_perry_-_roar.json"),
      "flawless": require("@/assets/timestamps/beyonce_-_flawless.json"),
      "drunk_in_love": require("@/assets/timestamps/beyonce_-_drunk_in_love.json"),
      "marry_the_night": require("@/assets/timestamps/lady_gaga_-_marry_the_night.json"),
    };

    // Try exact match first
    if (assetMap[normalized]) {
      return assetMap[normalized].timestamps || [];
    }

    // Try substring match as fallback
    const keys = Object.keys(assetMap);
    for (const key of keys) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return assetMap[key].timestamps || [];
      }
    }

    console.warn(
      `[timestampsLoader] No timestamps found for song: "${songTitle}" (normalized: "${normalized}")`
    );
    return [];
  } catch (e) {
    console.warn(
      `[timestampsLoader] Failed to load timestamps for "${songTitle}":`,
      e
    );
    return [];
  }
}
