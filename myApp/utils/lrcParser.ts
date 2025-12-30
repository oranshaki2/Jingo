/**
 * LRC Parser - Converts LRC timestamp format to milliseconds array
 * LRC format: [MM:SS.CC]
 * Example: [00:02.93] -> 2930 milliseconds
 */

/**
 * Converts MM:SS.CC format to milliseconds
 * @param timeStr Format: MM:SS.CC (e.g., "00:02.93")
 * @returns Time in milliseconds
 */
function lrcTimeToMs(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\.(\d+)/);
  if (!match) return 0;

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const centiseconds = parseInt(match[3], 10);

  return minutes * 60000 + seconds * 1000 + centiseconds * 10;
}

/**
 * Parses LRC file content and extracts timestamps for lyric lines
 * Skips metadata lines and empty lines
 * @param lrcContent Raw LRC file content as string
 * @returns Array of timestamps in milliseconds, one per lyric line
 */
export function parseLrcTimestamps(lrcContent: string): number[] {
  const timestamps: number[] = [];
  const lines = lrcContent.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and metadata (lines starting with [ but not containing time)
    if (!trimmed || !trimmed.startsWith("[")) {
      continue;
    }

    // Match [MM:SS.CC] pattern at the start of the line
    const timeMatch = trimmed.match(/^\[(\d+:\d+\.\d+)\]/);
    if (!timeMatch) {
      continue; // Skip metadata lines like [ar:], [ti:], etc.
    }

    const ms = lrcTimeToMs(timeMatch[1]);
    timestamps.push(ms);
  }

  return timestamps;
}

/**
 * Loads LRC file from data/timestamps directory and parses it
 * @param songFileName Song file name without extension (e.g., "you_belong_with_me-taylor_swift")
 * @returns Array of timestamps in milliseconds, or empty array on failure
 */
export async function loadLrcTimestamps(songFileName: string): Promise<number[]> {
  try {
    // For React Native, we'd need to use require() at build time or fetch from a server
    // Since LRC files are in data/timestamps (not bundled), we need to handle this differently
    // This is a placeholder that should be called during app setup
    console.warn(
      "[lrcParser] loadLrcTimestamps requires pre-processing LRC files during build"
    );
    return [];
  } catch (e) {
    console.warn(`[lrcParser] Failed to load timestamps for ${songFileName}:`, e);
    return [];
  }
}

/**
 * Converts milliseconds to MM:SS.CC format
 * Useful for debugging or display
 */
export function msToLrcFormat(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
}
