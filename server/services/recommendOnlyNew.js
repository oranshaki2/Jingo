// =============================================================================
// Recommendation Service – "Only New Words"
// =============================================================================
// This service powers the song recommendation feature.
//
// The goal: suggest songs that teach the user *new* vocabulary words in a
// category they chose (e.g. Animals, Food, Clothing…).
//
// A song is a good recommendation when ALL of these are true:
//   1. Its genre matches one of the genres the user likes.
//   2. It belongs to the category the user selected.
//   3. It has at least 2 words the user has NOT seen before (not in their
//      word history), at the right difficulty level for that user.
//
// The service returns an object grouped by genre, so the app can display
// recommendations separately per genre:
//   { "Pop": [ song1, song2, ... ], "Rock": [ song3, ... ] }
// =============================================================================

// services/recommendOnlyNew.js
const Song = require("../models/song");

// Maximum number of recommended songs to return per genre in one request.
// Keeps responses fast and avoids overwhelming the user with too many choices.
const MAX_RECOMMENDATIONS = 10;
const MIN_WORDS_PER_SONG = 1; // Minimum number of new words a song must have to be recommended

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

/**
 * Loads every song from the database.
 *
 * We use `.lean()` so Mongoose returns plain JavaScript objects instead of
 * full Mongoose document instances.  Plain objects are faster to work with
 * and use less memory when we only need to read the data (no saving needed).
 *
 * @returns {Promise<Object[]>} Array of all song documents as plain objects.
 */
const getSongsFromDB = async () => {
  return await Song.find().lean();
};

// ---------------------------------------------------------------------------
// Helper – picture key normalisation
// ---------------------------------------------------------------------------

/**
 * Converts a raw picture value (file path or filename) into a short,
 * consistent "key" that the front-end can use to look up the actual image.
 *
 * Background: pictures are stored as full paths in the database
 * (e.g. "profilePics/Taylor_Swift.png"), but the app only needs a clean
 * lowercase key (e.g. "taylor_swift") to find the right image asset.
 *
 * Steps:
 *   1. Strip any leading directory components, keeping only the filename.
 *   2. Remove the file extension (.png / .jpg / .webp).
 *   3. Lowercase, remove accents, replace non-word characters with underscores.
 *   4. Trim any leading/trailing underscores.
 *
 * @param {string} s - Raw picture value from the database.
 * @returns {string|null} Normalised key, or null if the input was empty.
 */
function normalizePictureKey(s) {
  if (!s) return null;
  // Keep only the filename part (strip directory path)
  const base = String(s)
    .trim()
    .replace(/^.*[\\/]/, "");
  // Remove the file extension
  const noExt = base.replace(/\.(png|jpe?g|webp)$/i, "");
  // Convert to a clean lowercase key: remove accents, replace spaces/special
  // chars with underscores, and trim leading/trailing underscores
  const key = noExt
    .toLowerCase()
    .normalize("NFKD") // decompose accented characters (é → e + combining accent)
    .replace(/[^\w]+/g, "_") // replace anything that isn't a letter/digit/_ with _
    .replace(/^_+|_+$/g, ""); // strip leading and trailing underscores
  return key || null;
}

// ---------------------------------------------------------------------------
// Helper – word list extraction
// ---------------------------------------------------------------------------

/**
 * Finds the list of vocabulary words for a specific category inside a song.
 *
 * Background: the database stores two parallel arrays per song:
 *   - `song.categories`     → e.g. ["Animals", "Food"]
 *   - `song.category_words` → e.g. [["dog","cat",1], ["pizza","burger",2]]
 *
 * The index of the category in the first array matches the index of its
 * word list in the second array — so we find the right position and return
 * the corresponding word list.
 *
 * @param {Object} song             - A song document from the database.
 * @param {string} selectedCategory - The category the user wants to learn
 *                                    (e.g. "Animals").
 * @returns {Array|null} The word list for that category, or null if the
 *                       song doesn't have the category at all.
 */
function pickWordsForCategory(song, selectedCategory) {
  // Guard: make sure the song has the required arrays
  if (
    !song ||
    !Array.isArray(song.categories) ||
    !Array.isArray(song.category_words)
  )
    return null;

  // Find the position of the selected category (case-insensitive comparison)
  const wanted = String(selectedCategory || "")
    .trim()
    .toLowerCase();
  const idx = song.categories.findIndex(
    (c) =>
      String(c || "")
        .trim()
        .toLowerCase() === wanted,
  );

  // Category not present in this song
  if (idx === -1) return null;

  // Return the matching word list (same index as the category)
  return song.category_words[idx];
}

// ---------------------------------------------------------------------------
// Helper – new-word filtering
// ---------------------------------------------------------------------------

/**
 * Returns only the words from a category word list that the user hasn't
 * learned yet AND that match the user's current difficulty level.
 *
 * Background: each category word list in the database looks like this:
 *   ["dog", "cat", "bird", 1]
 *   └─ vocabulary words ──┘  └─ difficulty level (last element)
 *
 * The last element is always the CEFR difficulty level (1=A, 2=B, 3=C).
 * The rest are the actual vocabulary words for the category.
 *
 * A word is "new" if it does NOT appear in the user's `wordHistory`
 * (the list of words they've already encountered in previous sessions).
 *
 * @param {Array}  singleCategoryWordList - Word list from the DB including
 *                                          level as the last element.
 * @param {string[]} userHistory          - Words the user has already seen.
 * @param {number}   userLevel            - The user's current difficulty level
 *                                          (1, 2, or 3).
 * @returns {string[]} Unique unseen words, or an empty array if the level
 *                     doesn't match or the input is invalid.
 */
function filterWordsByHistory(singleCategoryWordList, userHistory, userLevel) {
  // Guard: nothing to process if the list is empty or not an array
  if (
    !Array.isArray(singleCategoryWordList) ||
    singleCategoryWordList.length === 0
  )
    return [];

  // The last element of the list is the difficulty level, not a word
  const maybeLevel = singleCategoryWordList[singleCategoryWordList.length - 1];
  const level = Number(maybeLevel);

  // Skip this song if its level doesn't match the user's current level
  // (we only want songs at exactly the right difficulty)
  if (!Number.isFinite(level) || level !== Number(userLevel)) return [];

  // Everything except the last element is a vocabulary word
  const words = singleCategoryWordList.slice(0, -1).map((w) => String(w));

  // Normalise history to strings for reliable comparison
  const history = Array.isArray(userHistory)
    ? userHistory.map((w) => String(w))
    : [];

  // Keep only words the user hasn't seen before
  const unseen = words.filter((w) => !history.includes(w));

  // De-duplicate (just in case the same word appears twice in the list)
  return [...new Set(unseen)];
}

// ---------------------------------------------------------------------------
// Main recommendation function
// ---------------------------------------------------------------------------

/**
 * Builds a list of song recommendations for a user, grouped by genre.
 *
 * This is the main function called by the controller.  It iterates over
 * every genre the user likes and finds songs that:
 *   - belong to that genre
 *   - contain the vocabulary category the user selected
 *   - have at least 2 words the user hasn't learned yet, at the right level
 *
 * @param {Object}   user              - The user object from the request body.
 * @param {string[]} user.genre        - Genres the user is interested in.
 * @param {string[]} user.wordHistory  - Words the user has already seen.
 * @param {number}   user.level        - User's current CEFR difficulty level.
 * @param {string}   selectedCategory  - The vocabulary category to focus on
 *                                       (e.g. "Animals", "Food").
 *
 * @returns {Promise<Object>} An object keyed by genre, each value being an
 *                             array of recommended song objects, e.g.:
 *                             { "Pop": [...songs], "Rock": [...songs] }
 */
async function recommendOnlyNewWords(user, selectedCategory) {
  // Load all songs from the database once (not per genre — more efficient)
  const allSongs = await getSongsFromDB();
  console.log(`Loaded ${allSongs.length} songs from DB.`);

  // The result object — will be populated per genre below
  const genreRecommendations = {};

  // Loop over each genre the user likes
  for (const genre of user.genre) {
    const recommendations = [];

    for (const song of allSongs) {
      // 1. Match genre (case-insensitive so "pop" and "Pop" both work)
      if (
        String(song.genre || "")
          .trim()
          .toLowerCase() !==
        String(genre || "")
          .trim()
          .toLowerCase()
      ) {
        continue;
      }

      // 2. Does the song belong to the category the user selected?
      const hasCategory =
        Array.isArray(song.categories) &&
        song.categories.some(
          (c) =>
            String(c || "")
              .trim()
              .toLowerCase() === String(selectedCategory).trim().toLowerCase(),
        );
      if (!hasCategory) continue;

      // 3. Get the word list for the selected category inside this song
      const listForCategory = pickWordsForCategory(song, selectedCategory);
      if (!listForCategory) continue;

      // 4. Keep only words the user hasn't seen yet (at the right level)
      const newWords = filterWordsByHistory(
        listForCategory,
        user.wordHistory || [],
        user.level,
      );
      // Skip songs with fewer than the minimum required new words — not worth recommending
      if (newWords.length < MIN_WORDS_PER_SONG) continue;

      // 5. Normalise the picture reference.
      // Pictures stored as full paths (e.g. "profilePics/image.png") are
      // converted to a short key the front-end can use to find the asset.
      // Pictures that are already full URLs (http/https) are left as-is.
      let picture = song.picture;
      if (picture && !/^https?:\/\//i.test(picture)) {
        picture = normalizePictureKey(picture);
      }

      // 6. Add this song to the recommendation list for this genre
      recommendations.push({
        _id: song._id,
        title: song.name,
        artist: song.artist,
        genre: song.genre,
        newWords, // only the words the user hasn't seen yet
        picture,
        lyrics: song.lyrics || "",
        audioURL: song.audioURL || "",
      });

      // Stop once we have enough recommendations for this genre
      if (recommendations.length >= MAX_RECOMMENDATIONS) break;
    }

    // Store the results for this genre (may be an empty array if no matches)
    genreRecommendations[genre] = recommendations;
  }

  return genreRecommendations;
}

module.exports = { recommendOnlyNewWords };
