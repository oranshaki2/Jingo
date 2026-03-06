#!/usr/bin/env node
// =============================================================================
// LRC → JSON Preprocessor
// =============================================================================
// Run this script once (or whenever new .lrc files are added) with:
//   node scripts/preprocessLrc.js
//
// What is an LRC file?
//   LRC is a simple text format for song lyrics with timestamps.
//   Each line looks like:  [01:23.45] These are the lyrics for that moment
//   The timestamp [MM:SS.CC] tells a media player exactly when to highlight
//   that line — MM = minutes, SS = seconds, CC = centiseconds (1/100th sec).
//
// Why do we need this script?
//   The React Native app needs to know *when* each lyric line should be shown
//   as the song plays.  The raw LRC files live in data/timestamps/ and are
//   convenient for humans to edit, but the app is faster reading pre-parsed
//   JSON files.  This script converts every .lrc file into a clean .json file
//   containing just an array of millisecond timestamps.
//
// Input:   data/timestamps/*.lrc
// Output:  myApp/assets/timestamps/*.json
//
// Output JSON shape (one file per song):
//   {
//     "file": "original-filename-without-extension",
//     "lineCount": 42,
//     "timestamps": [0, 3210, 7500, ...]   ← milliseconds, one per lyric line
//   }
// =============================================================================

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Path constants
// ---------------------------------------------------------------------------
// Where to read .lrc source files from (relative to the repo root)
const LRC_INPUT_DIR = path.join(__dirname, "../data/timestamps");
// Where to write the converted .json files (inside the React Native app's assets)
const JSON_OUTPUT_DIR = path.join(__dirname, "../myApp/assets/timestamps");

// Create the output directory if it doesn't exist yet
// { recursive: true } means it won't throw if the folder is already there
if (!fs.existsSync(JSON_OUTPUT_DIR)) {
  fs.mkdirSync(JSON_OUTPUT_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Helper – timestamp conversion
// ---------------------------------------------------------------------------

/**
 * Converts an LRC timestamp string into a total number of milliseconds.
 *
 * LRC timestamps look like "01:23.45" which means 1 minute, 23 seconds,
 * and 45 centiseconds.  We convert everything to milliseconds so the app
 * can compare it directly with the current playback position (also in ms).
 *
 * Example:
 *   "01:23.45"  →  1 * 60000 + 23 * 1000 + 45 * 10  =  83450 ms
 *
 * @param {string} timeStr - Timestamp in "MM:SS.CC" format (e.g. "01:23.45").
 * @returns {number} Total milliseconds, or 0 if the format is unrecognised.
 */
function lrcTimeToMs(timeStr) {
  // Extract the three numeric groups: minutes, seconds, centiseconds
  const match = timeStr.match(/(\d+):(\d+)\.(\d+)/);
  if (!match) return 0; // unrecognised format — default to 0

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const centiseconds = parseInt(match[3], 10);

  // Centiseconds are 1/100 of a second, so multiply by 10 to get milliseconds
  return minutes * 60000 + seconds * 1000 + centiseconds * 10;
}

// ---------------------------------------------------------------------------
// Helper – LRC file parser
// ---------------------------------------------------------------------------

/**
 * Reads the text content of an LRC file and extracts an ordered list of
 * millisecond timestamps — one per lyric line.
 *
 * LRC lines look like:
 *   [01:23.45] Hello world
 *   [01:26.00] These are the lyrics
 *
 * We only care about the timestamp part (inside the brackets); the actual
 * lyric text is already stored separately in the app's lyrics JSON files.
 * This file just tells the app *when* to move to the next line.
 *
 * Lines without a valid timestamp (e.g. blank lines or metadata tags like
 * [ti:Song Title]) are silently skipped.
 *
 * @param {string} content - Full text content of an .lrc file.
 * @returns {number[]} Array of timestamps in milliseconds, in song order.
 */
function parseLrc(content) {
  const timestamps = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      continue;
    }

    // Look for the [MM:SS.CC] pattern at the very start of the line.
    // Lines that don't start with this pattern (e.g. metadata or blank)
    // are ignored.
    const timeMatch = trimmed.match(/^\[(\d+):(\d+)\.(\d+)\]/);
    if (!timeMatch) {
      continue;
    }

    // timeMatch[0] is the full match including brackets, e.g. "[01:23.45]"
    // .slice(1, -1) removes the surrounding brackets → "01:23.45"
    const ms = lrcTimeToMs(timeMatch[0].slice(1, -1));
    timestamps.push(ms);
  }

  return timestamps;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Reads every .lrc file from the input directory, converts it to a JSON
 * timestamps file, and writes the result to the output directory.
 *
 * File naming:
 *   The output filename is a normalised version of the input filename.
 *   "My Song - Artist Name.lrc"  →  "my_song-artist_name.json"
 *   This matches the naming convention used by the lyrics JSON files so the
 *   app can pair them up automatically.
 */
function main() {
  // Make sure the input directory actually exists before trying to read it
  if (!fs.existsSync(LRC_INPUT_DIR)) {
    console.error(`❌ Input directory not found: ${LRC_INPUT_DIR}`);
    process.exit(1);
  }

  // Collect only .lrc files (ignore any other files in the directory)
  const files = fs.readdirSync(LRC_INPUT_DIR).filter((f) => f.endsWith(".lrc"));

  if (files.length === 0) {
    console.warn("⚠️  No .lrc files found");
    return;
  }

  console.log(`📂 Processing ${files.length} LRC files...\n`);

  files.forEach((file) => {
    const inputPath = path.join(LRC_INPUT_DIR, file);

    // Remove the .lrc extension to get the base name (e.g. "My Song - Artist")
    const baseName = path.basename(file, ".lrc");

    // Normalise to lowercase with underscores so the filename is URL-safe and
    // matches the pattern used by the lyrics JSON files:
    //   spaces → underscores, special characters removed, hyphens kept
    const normalizedName = baseName
      .toLowerCase()
      .replace(/\s+/g, "_") // "My Song" → "my_song"
      .replace(/[^\w-]/g, ""); // remove anything that isn't a word char or hyphen

    const outputPath = path.join(JSON_OUTPUT_DIR, `${normalizedName}.json`);

    try {
      // Read the raw LRC text and extract the timestamps
      const content = fs.readFileSync(inputPath, "utf8");
      const timestamps = parseLrc(content);

      // Build the output object the app will read
      const output = {
        file: baseName, // original name (for debugging / display)
        lineCount: timestamps.length, // how many lyric lines this song has
        timestamps: timestamps, // the actual ms values the app uses
      };

      // Write as pretty-printed JSON (2-space indent) so it's human-readable
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(
        `✅ ${file} -> ${normalizedName}.json (${timestamps.length} lines)`,
      );
    } catch (e) {
      // Log the error and continue with the next file — don't abort the whole run
      console.error(`❌ Failed to process ${file}:`, e.message);
    }
  });

  console.log("\n✨ Done! Timestamps processed to:", JSON_OUTPUT_DIR);
}

main();
