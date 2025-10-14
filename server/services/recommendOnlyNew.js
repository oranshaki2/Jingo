const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * Constructs a public URL for accessing assets based on environment configuration.
 * Uses PUBLIC_BASE_URL from environment variables or defaults to localhost.
 */
function publicAssetUrl(relativePath) {
  const base = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  const rel = String(relativePath || '').replace(/^\/+/, '');
  const url = `${base.replace(/\/+$/, '')}/assets/${rel}`; // מסיר / בסוף base
  return url;
}

// Helper: normalize CSV value into a key (snake_case like "taylor_swift")
function normalizePictureKey(s) {
  if (!s) return null;
  // basename
  const base = String(s).trim().replace(/^.*[\\/]/, "");
  // strip ext
  const noExt = base.replace(/\.(png|jpe?g|webp)$/i, "");
  // snake
  const key = noExt
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return key || null;
}

/**
 * Loads songs from a CSV file and parses relevant fields.
 * Parses the song title, artist, genre, categories, and categoryWords.
 * Handles malformed rows gracefully by skipping them.
 */
function loadSongsFromCSV(filePath) {
  return new Promise((resolve, reject) => {
    const songs = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          const categories = JSON.parse(row.categories.replace(/'/g, '"'));
          const categoryWords = JSON.parse(row.category_words.replace(/'/g, '"'));

          
          // Handle picture field if present
          // prefer "picture" key or fall back to legacy column names
          const rawPicture = (row.picture || row.Picture || "").trim();

          let picture = null;
          if (rawPicture) {
            if (/^https?:\/\//i.test(rawPicture)) {
              // remote image URL — let the app load via { uri }
              picture = rawPicture;
            } else {
              // key (new behavior) or local path — normalize to key for RN require-map
              picture = normalizePictureKey(rawPicture);
            }
          }

          const song = {
            title: row.Song || row['\uFEFFSong'],
            artist: row.Artist,
            genre: row.Genre,
            categories,
            categoryWords,
            picture,
            lyrics: row.lyrics || '',
            lyricsHebrew: row.lyricsHebrew || '',
          };

          songs.push(song);
        } catch (e) {
          console.warn('Skipping invalid row:', row, e.message);
        }
      })
      .on('end', () => resolve(songs))
      .on('error', reject);
  });
}
/**
 * Extracts and returns a list of words from the song that the user has not yet learned.
 * Filters out already known words based on the user's history.
 * If the song's level matches the user's level, it includes those words.
 */
function filterWordsByHistory(categoryWords, userHistory, userLevel) {
  const newWords = [];

  for (const wordList of categoryWords) {
    const level = wordList[wordList.length - 1];

    if (level == userLevel) {
      const words = wordList.slice(0, -1);
      const unseenWords = words.filter(word => !userHistory.includes(word));
      newWords.push(...unseenWords);
    }
  }

  return [...new Set(newWords)];
}

/**
 * Returns the word-list (single array) that matches the requested category.
 * It uses the index of the category inside song.categories to pick the
 * parallel array from song.categoryWords.
 */
function pickWordsForCategory(song, selectedCategory) {
  if (!song || !Array.isArray(song.categories) || !Array.isArray(song.categoryWords)) return null;

  const wanted = String(selectedCategory || '').trim().toLowerCase();
  const idx = song.categories.findIndex(
    (c) => String(c || '').trim().toLowerCase() === wanted
  );

  if (idx === -1) return null;
  const list = song.categoryWords[idx];
  return Array.isArray(list) ? list : null;
}

/**
 * Filters a *single* category word-list by user history and level.
 * The list format is: ["word1", "word2", ..., levelNumber]
 * We return only unseen words when the level matches exactly.
 */
function filterWordsByHistory(singleCategoryWordList, userHistory, userLevel) {
  if (!Array.isArray(singleCategoryWordList) || singleCategoryWordList.length === 0) return [];

  const maybeLevel = singleCategoryWordList[singleCategoryWordList.length - 1];
  const level = Number(maybeLevel);

  // If the level is not a number or doesn't match the user's level -> no words
  if (!Number.isFinite(level) || level !== Number(userLevel)) return [];

  // All items except the last are the words
  const words = singleCategoryWordList.slice(0, -1).map((w) => String(w));
  const history = Array.isArray(userHistory) ? userHistory.map((w) => String(w)) : [];

  const unseen = words.filter((w) => !history.includes(w));
  return [...new Set(unseen)]; // ensure uniqueness
}

/**
 * Recommends up to 20 songs per genre for the user.
 * Only includes songs from a selected category that contain new vocabulary
 * not previously encountered by the user.
 */
async function recommendOnlyNewWords(csvPath, user, selectedCategory) {
  const allSongs = await loadSongsFromCSV(csvPath);
  const genreRecommendations = {};

  for (const genre of user.genre) {
    const recommendations = [];

    for (const song of allSongs) {
      // 1) Genre must match
      if (String(song.genre || '').toLowerCase() !== String(genre || '').toLowerCase()) continue;

      // 2) Song must contain the selected category
      if (!Array.isArray(song.categories)) continue;
      const hasCategory = song.categories.some(
        (c) => String(c || '').trim().toLowerCase() === String(selectedCategory || '').trim().toLowerCase()
      );
      if (!hasCategory) continue;

      // 3) Pick ONLY the word-list for that category, then filter by history & level
      const listForCategory = pickWordsForCategory(song, selectedCategory);
      if (!listForCategory) continue;

      const newWords = filterWordsByHistory(listForCategory, user.wordHistory, user.level);

      if (newWords.length > 0) {
        recommendations.push({
          title: song.title,
          artist: song.artist,
          genre: song.genre,
          newWords,
          picture: song.picture,
          lyrics: song.lyrics,
          lyricsHebrew: song.lyricsHebrew,
        });
      }

      if (recommendations.length >= 20) break;
    }

    genreRecommendations[genre] = recommendations;
  }

  return genreRecommendations;
}

module.exports = { recommendOnlyNewWords };