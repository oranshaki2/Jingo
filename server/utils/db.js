const mongoose = require("mongoose");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const csv = require("csv-parser");
const Song = require("../models/song");

/*
 * Resolves the CSV file path from environment variable or defaults.
 */
function resolveCsvPath() {
  const fromEnv =
    process.env.SONGS_CSV_PATH && String(process.env.SONGS_CSV_PATH).trim();
  if (fromEnv) {
    // Resolve relative to the process working dir (where you run `node app.js`, i.e., /server)
    const abs = path.isAbsolute(fromEnv)
      ? fromEnv
      : path.resolve(process.cwd(), fromEnv);
    return abs;
  }
  // Fallback to the repo default (resolve relative to the server working dir)
  // ...changed default filename to match repository
  return path.resolve(process.cwd(), "../data/some_songs.csv");
}

/**
 * Connects to MongoDB using Mongoose.
 */
const connectDB = async () => {
  try {
    const uri =
      process.env.CONNECTION_STRING || "mongodb://localhost:27017/jingo_db";
    // Use CONNECTION_STRING as default
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected successfully.");
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    // Throw the error so app.js can handle it
    throw error;
  }
};

/**
 * Parse CSV, load/create lyrics files, and return song objects ready for DB insertion.
 */
const parseSongsFromCsv = async () => {
  const csvFilePath = resolveCsvPath();
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found at: ${csvFilePath}`);
  }

  const rows = [];
  // stream CSV into rows
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  // Place lyrics directory next to the CSV file (../data/lyrics)
  const lyricsDir = path.join(path.dirname(csvFilePath), "lyrics");

  // ensure lyrics directory exists
  try {
    await fsPromises.mkdir(lyricsDir, { recursive: true });
  } catch (e) {
    // if something goes wrong, just log and continue — will error on write/read if truly problematic
    console.warn("⚠️ Could not ensure lyrics directory exists:", e.message);
  }

  const normalize = (s) => {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  const songsToInsert = [];

  for (const row of rows) {
    try {
      // Parse categories and category_words safely (CSV uses single quotes)
      let categories = [];
      let category_words = [];

      if (row.categories && row.categories.trim()) {
        try {
          categories = JSON.parse(row.categories.replace(/'/g, '"'));
        } catch (e) {
          console.warn(
            `⚠️ Couldn't parse categories for "${row.Song}". Using empty array.`
          );
          categories = [];
        }
      }

      if (row.category_words && row.category_words.trim()) {
        try {
          category_words = JSON.parse(row.category_words.replace(/'/g, '"'));
        } catch (e) {
          console.warn(
            `⚠️ Couldn't parse category_words for "${row.Song}". Using empty array.`
          );
          category_words = [];
        }
      }

      // prepare picture/audioURL
      const picture = row.picture ? String(row.picture).trim() : "";
      const audioURL = row.audioURL ? String(row.audioURL).trim() : "";

      // build lyrics filename
      const songSlug = normalize(row.Song);
      const artistSlug = normalize(row.Artist);
      const lyricsFilename = `${songSlug}-${artistSlug}.json`;
      const lyricsPath = path.join(lyricsDir, lyricsFilename);

      // read lyrics file if exists, otherwise create it with [] and set lyrics to []
      let lyricsArray = [];
      try {
        const data = await fsPromises.readFile(lyricsPath, "utf8");
        // try parse; if parse fails set to empty array and log
        try {
          lyricsArray = JSON.parse(data);
        } catch (e) {
          console.warn(
            `⚠️ Lyrics JSON invalid for ${lyricsFilename}. Overwriting with empty array.`
          );
          await fsPromises.writeFile(lyricsPath, "[]", "utf8");
          lyricsArray = [];
        }
      } catch (err) {
        if (err.code === "ENOENT") {
          console.warn(
            `⚠️ Lyrics file not found for "${row.Song}" by "${row.Artist}". Creating empty lyrics file: ${lyricsFilename}`
          );
          try {
            await fsPromises.writeFile(lyricsPath, "[]", "utf8");
          } catch (writeErr) {
            console.error(
              `❌ Failed to create lyrics file ${lyricsFilename}:`,
              writeErr.message
            );
          }
          lyricsArray = [];
        } else {
          console.error(
            `❌ Error reading lyrics file ${lyricsFilename}:`,
            err.message
          );
          lyricsArray = [];
        }
      }

      songsToInsert.push({
        name: row.Song ? String(row.Song).trim() : "",
        artist: row.Artist ? String(row.Artist).trim() : "",
        genre: row.Genre ? String(row.Genre).trim() : "",
        categories,
        category_words,
        picture,
        audioURL,
        lyrics: lyricsArray,
      });
    } catch (e) {
      console.error(
        `❌ Error processing row for song "${row.Song || "<unknown>"}":`,
        e.message
      );
    }
  }

  return songsToInsert;
};

/**
 * Initializes the database with songs from the CSV file.
 */
const initializeDB = async () => {
  // Read and parse the CSV file (and load/create lyrics files)
  const songsData = await parseSongsFromCsv();

  if (!songsData || songsData.length === 0) {
    console.log("⚠️ CSV file contained no valid songs to insert.");
    return;
  }

  // Create Bulk Write operations for insert/update
  const bulkOperations = songsData.map((song) => ({
    updateOne: {
      filter: { name: song.name, artist: song.artist },
      update: { $set: song },
      upsert: true,
    },
  }));

  const result = await Song.bulkWrite(bulkOperations);
  console.log(
    `🎉 Database initialized successfully. `
  );
};

module.exports = { connectDB, initializeDB };
