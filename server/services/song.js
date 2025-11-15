// server/services/song.js
const Song = require("../models/song");
// const axios = require('axios');
// const net = require('net');
const mongoose = require("mongoose");
const User = require("../models/user"); // added user model

// Create a new song
const createSong = async (
  name,
  artist,
  genre,
  categories,
  category_words,
  picture,
  audioURL,
  lyrics
) => {
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

  await song.save();
  return song;
};

// Get all songs
const getSongs = async () => {
  return await Song.find({});
};

// Get a specific song by ID
const getSongById = async (id) => {
  return await Song.findById(id);
};

const getFavoriteSuggestions = async (userId, currentSongId) => {
  // Validate IDs
  if (!userId || !currentSongId) return [];
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(currentSongId)
  ) {
    return [];
  }

  const userIdStr = String(userId);
  const currentSongIdStr = String(currentSongId);

  // Load current user
  const currentUser = await User.findById(userId).select("favorites").lean();
  if (!currentUser) return [];

  const currentFavs = Array.isArray(currentUser.favorites)
    ? currentUser.favorites.map(String)
    : [];
  const currentFavsSet = new Set(currentFavs);

  // Load all users (only need favorites)
  const allUsers = await User.find({}).select("favorites").lean();

  const scores = new Map(); // songId -> score (number)

  for (const other of allUsers) {
    if (!other || !other._id) continue;
    const otherIdStr = String(other._id);
    if (otherIdStr === userIdStr) continue; // skip self

    const otherFavs = Array.isArray(other.favorites)
      ? other.favorites.map(String)
      : [];

    // Only consider users who have the current song in their favorites
    if (!otherFavs.includes(currentSongIdStr)) continue;

    // Compute number of common favorites with current user (intersection size)
    let commonCount = 0;
    for (const s of otherFavs) {
      if (currentFavsSet.has(s)) commonCount++;
    }
    if (commonCount <= 0) continue; // nothing to contribute

    // For each song in their favorites:
    for (const songId of otherFavs) {
      if (songId === currentSongIdStr) continue; // skip the current song
      if (currentFavsSet.has(songId)) continue; // skip songs current user already has

      const prev = scores.get(songId) || 0;
      scores.set(songId, prev + commonCount);
    }
  }

  // Convert scores to array and sort by score desc, songId asc
  const sorted = Array.from(scores.entries())
    .sort((a, b) => {
      const scoreDiff = b[1] - a[1];
      if (scoreDiff !== 0) return scoreDiff;
      // tie-breaker: songId ascending (string)
      if (a[0] < b[0]) return -1;
      if (a[0] > b[0]) return 1;
      return 0;
    })
    .slice(0, 10) // top 10
    .map(([songId]) => songId);

  return sorted;
};

module.exports = {
  createSong,
  getSongs,
  getSongById,
  getFavoriteSuggestions,
};
