// =============================================================================
// Song Service
// =============================================================================
// This file contains all database operations related to songs.
// Controllers should never query the database directly — they call these
// functions instead.  This keeps the database logic in one place and makes
// it easy to change later (e.g. swapping MongoDB for another database).
//
// Functions exposed:
//   createSong           – add a new song to the database
//   getSongs             – fetch every song
//   getSongById          – fetch one song by its ID
//   getFavoriteSuggestions – "users who liked this also liked…" feature
// =============================================================================

// server/services/song.js
const Song = require("../models/song");
const mongoose = require("mongoose");
const User = require("../models/user");

// Maximum number of song IDs returned by getFavoriteSuggestions.
// Keeping this small ensures the response is fast and the UI stays clean.
const MAX_RECOMMENDATIONS = 10;

// ---------------------------------------------------------------------------
// Basic CRUD operations
// ---------------------------------------------------------------------------

/**
 * Saves a new song record to the database.
 *
 * @param {string}   name            - The song title.
 * @param {string}   artist          - The artist / band name.
 * @param {string}   genre           - Genre label (e.g. "Pop", "Rock").
 * @param {string[]} categories      - Vocabulary categories the song covers
 *                                     (e.g. ["Animals", "Food"]).
 * @param {Array[]}  category_words  - Parallel array of word lists + level,
 *                                     one sub-array per category
 *                                     (e.g. [["dog","cat",1],["pizza",2]]).
 * @param {string}   picture         - URL or file path for the cover image.
 * @param {string}   audioURL        - URL of the audio file.
 * @param {Array}    lyrics          - Array of lyric objects { english, hebrew }.
 * @returns {Promise<Object>} The saved Mongoose song document.
 */
const createSong = async (
  name,
  artist,
  genre,
  categories,
  category_words,
  picture,
  audioURL,
  lyrics,
) => {
  // Build a new Song document using the Mongoose model (does not hit DB yet)
  const song = new Song({
    name,
    artist,
    genre,
    categories,
    category_words,
    picture,
    audioURL,
    lyrics,
  });

  // Persist to MongoDB and return the saved document (now has an _id)
  await song.save();
  return song;
};

/**
 * Fetches every song in the database.
 *
 * @returns {Promise<Object[]>} Array of all song documents.
 */
const getSongs = async () => {
  return await Song.find({});
};

/**
 * Fetches a single song by its MongoDB _id.
 *
 * @param {string} id - The song's unique database ID.
 * @returns {Promise<Object|null>} The song document, or null if not found.
 */
const getSongById = async (id) => {
  return await Song.findById(id);
};

// ---------------------------------------------------------------------------
// Collaborative-filtering recommendation
// ---------------------------------------------------------------------------

/**
 * Suggests songs the user might like based on what other users with similar
 * taste also added to their favorites — the classic "users who learned this song also learned…"  approach.
 *
 * Algorithm (collaborative filtering):
 *   1. Find every other user who has `currentSongId` in their favorites
 *      (they share the user's interest in that song).
 *   2. For each such "similar user", count how many favorites they share
 *      with the current user overall (the "commonCount" / similarity score).
 *   3. Award each song in the similar user's favorites a score equal to
 *      `commonCount`.  Songs endorsed by more similar users accumulate
 *      higher scores.
 *   4. Skip songs the current user already has in their own favorites.
 *   5. Return the top MAX_RECOMMENDATIONS song IDs, sorted by score
 *      (highest first), using songId as a tie-breaker.
 *
 * @param {string} userId        - The ID of the user requesting suggestions.
 * @param {string} currentSongId - The song the user is currently viewing
 *                                  (the "seed" for the recommendation).
 * @returns {Promise<string[]>} Array of song ID strings (up to MAX_RECOMMENDATIONS),
 *                              or an empty array if nothing can be suggested.
 */
const getFavoriteSuggestions = async (userId, currentSongId) => {
  // --- Input validation --------------------------------------------------
  // Return an empty list rather than crashing if IDs are missing or malformed
  if (!userId || !currentSongId) return [];
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(currentSongId)
  ) {
    return [];
  }

  // Convert IDs to plain strings for consistent comparison throughout
  const userIdStr = String(userId);
  const currentSongIdStr = String(currentSongId);

  // --- Load current user's favorites ------------------------------------
  // We only need the 'favorites' field, so use .select() to avoid fetching
  // the entire user document.  .lean() returns a plain object (faster).
  const currentUser = await User.findById(userId).select("favorites").lean();
  if (!currentUser) return [];

  // Build a Set from the user's favorites for O(1) membership lookups below
  const currentFavs = Array.isArray(currentUser.favorites)
    ? currentUser.favorites.map(String)
    : [];
  const currentFavsSet = new Set(currentFavs);

  // --- Load every other user's favorites --------------------------------
  // Again, we only need the 'favorites' field — no other data required
  const allUsers = await User.find({}).select("favorites").lean();

  // `scores` maps a songId to a cumulative similarity score.
  // Songs with higher scores are better recommendations.
  const scores = new Map(); // { songId → score }

  for (const other of allUsers) {
    if (!other || !other._id) continue;
    const otherIdStr = String(other._id);
    if (otherIdStr === userIdStr) continue; // never compare a user against themselves

    const otherFavs = Array.isArray(other.favorites)
      ? other.favorites.map(String)
      : [];

    // Only consider users who also like the current song —
    // they are the "similar users" whose taste we trust
    if (!otherFavs.includes(currentSongIdStr)) continue;

    // Measure how similar this user is to the current user:
    // count the number of favorites they share (intersection size)
    let commonCount = 0;
    for (const s of otherFavs) {
      if (currentFavsSet.has(s)) commonCount++;
    }
    if (commonCount <= 0) continue; // no overlap — this user adds no signal

    // Give each song in this similar user's list a vote weighted by
    // how similar they are to the current user
    for (const songId of otherFavs) {
      if (songId === currentSongIdStr) continue; // skip the seed song itself
      if (currentFavsSet.has(songId)) continue; // skip songs the user already has

      // Add this user's similarity score to the song's running total
      const prev = scores.get(songId) || 0;
      scores.set(songId, prev + commonCount);
    }
  }

  // --- Rank and return top results --------------------------------------
  const sorted = Array.from(scores.entries())
    .sort((a, b) => {
      const scoreDiff = b[1] - a[1]; // higher score first
      if (scoreDiff !== 0) return scoreDiff;
      // Deterministic tie-breaker: alphabetical by songId string
      if (a[0] < b[0]) return -1;
      if (a[0] > b[0]) return 1;
      return 0;
    })
    .slice(0, MAX_RECOMMENDATIONS) // keep only the top N results
    .map(([songId]) => songId); // return just the IDs, not the scores

  return sorted;
};

module.exports = {
  createSong,
  getSongs,
  getSongById,
  getFavoriteSuggestions,
};
