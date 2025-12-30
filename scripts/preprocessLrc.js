#!/usr/bin/env node
/**
 * Preprocess LRC files to JSON format
 * Run: node scripts/preprocessLrc.js
 * 
 * This script converts LRC files from data/timestamps to JSON format
 * that can be imported in the React Native app
 */

const fs = require("fs");
const path = require("path");

const LRC_INPUT_DIR = path.join(__dirname, "../data/timestamps");
const JSON_OUTPUT_DIR = path.join(
  __dirname,
  "../myApp/assets/timestamps"
);

// Ensure output directory exists
if (!fs.existsSync(JSON_OUTPUT_DIR)) {
  fs.mkdirSync(JSON_OUTPUT_DIR, { recursive: true });
}

/**
 * Convert MM:SS.CC to milliseconds
 */
function lrcTimeToMs(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\.(\d+)/);
  if (!match) return 0;

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const centiseconds = parseInt(match[3], 10);

  return minutes * 60000 + seconds * 1000 + centiseconds * 10;
}

/**
 * Parse LRC file and extract timestamps
 */
function parseLrc(content) {
  const timestamps = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    // Match [MM:SS.CC] pattern at the start of the line
    const timeMatch = trimmed.match(/^\[(\d+):(\d+)\.(\d+)\]/);
    if (!timeMatch) {
      continue;
    }

    const ms = lrcTimeToMs(timeMatch[0].slice(1, -1)); // Remove brackets
    timestamps.push(ms);
  }

  return timestamps;
}

/**
 * Main processing
 */
function main() {
  if (!fs.existsSync(LRC_INPUT_DIR)) {
    console.error(`❌ Input directory not found: ${LRC_INPUT_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(LRC_INPUT_DIR).filter((f) => f.endsWith(".lrc"));

  if (files.length === 0) {
    console.warn("⚠️  No .lrc files found");
    return;
  }

  console.log(`📂 Processing ${files.length} LRC files...\n`);

  files.forEach((file) => {
    const inputPath = path.join(LRC_INPUT_DIR, file);
    const baseName = path.basename(file, ".lrc");
    // Convert "Song Name - Artist" to "song_name-artist" format to match lyrics
    const normalizedName = baseName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w-]/g, "");
    const outputPath = path.join(JSON_OUTPUT_DIR, `${normalizedName}.json`);

    try {
      const content = fs.readFileSync(inputPath, "utf8");
      const timestamps = parseLrc(content);

      const output = {
        file: baseName,
        lineCount: timestamps.length,
        timestamps: timestamps,
      };

      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(`✅ ${file} -> ${normalizedName}.json (${timestamps.length} lines)`);
    } catch (e) {
      console.error(`❌ Failed to process ${file}:`, e.message);
    }
  });

  console.log("\n✨ Done! Timestamps processed to:", JSON_OUTPUT_DIR);
}

main();
