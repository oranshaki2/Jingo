// services/recommendOnlyNew.js
const Song = require('../models/song');

const MAX_RECOMMENDATIONS = 10;

/**
 * gets all songs from the database
 */
const getSongsFromDB = async () => {
  return await Song.find().lean(); // .lean() to get plain objects
};

/**
 * normalizes picture key
 */
function normalizePictureKey(s) {
  if (!s) return null;
  const base = String(s).trim().replace(/^.*[\\/]/, "");
  const noExt = base.replace(/\.(png|jpe?g|webp)$/i, "");
  const key = noExt
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return key || null;
}

/**
 * picks the list of words for a category
 */
function pickWordsForCategory(song, selectedCategory) {
  if (!song || !Array.isArray(song.categories) || !Array.isArray(song.category_words)) return null;

  const wanted = String(selectedCategory || '').trim().toLowerCase();
  const idx = song.categories.findIndex(
    (c) => String(c || '').trim().toLowerCase() === wanted
  );

  if (idx === -1) return null;
  return song.category_words[idx]; 
}

/**
 * Filters new words – supports level as a string
 */
function filterWordsByHistory(singleCategoryWordList, userHistory, userLevel) {
  if (!Array.isArray(singleCategoryWordList) || singleCategoryWordList.length === 0) return [];

  const maybeLevel = singleCategoryWordList[singleCategoryWordList.length - 1];
  const level = Number(maybeLevel); 

  if (!Number.isFinite(level) || level !== Number(userLevel)) return [];

  const words = singleCategoryWordList.slice(0, -1).map(w => String(w));
  const history = Array.isArray(userHistory) ? userHistory.map(w => String(w)) : [];

  const unseen = words.filter(w => !history.includes(w));
  return [...new Set(unseen)];
}

/**
 * Recommends only new words based on user history and selected category
 */
async function recommendOnlyNewWords(user, selectedCategory) {
  const allSongs = await getSongsFromDB();
  console.log(`Loaded ${allSongs.length} songs from DB.`);

  const genreRecommendations = {};

  for (const genre of user.genre) {
    const recommendations = [];

    for (const song of allSongs) {
      // 1. Match genre (case-insensitive)
      if (String(song.genre || '').trim().toLowerCase() !== String(genre || '').trim().toLowerCase()) {
        continue;
      }

      // 2. Does the song have the selected category?
      const hasCategory = Array.isArray(song.categories) && song.categories.some(
        c => String(c || '').trim().toLowerCase() === String(selectedCategory).trim().toLowerCase()
      );
      if (!hasCategory) continue;

      // 3. Get list of words for the category
      const listForCategory = pickWordsForCategory(song, selectedCategory);
      if (!listForCategory) continue;

      // 4. Filter new words
      const newWords = filterWordsByHistory(listForCategory, user.wordHistory || [], user.level);
      if (newWords.length <= 1) continue; // requires at least 2 new words

      // 5. Normalize picture
      let picture = song.picture;
      if (picture && !/^https?:\/\//i.test(picture)) {
        picture = normalizePictureKey(picture);
      }

      // 6. Add to recommendations
      recommendations.push({
        _id: song._id,
        title: song.name,           
        artist: song.artist,
        genre: song.genre,
        newWords,
        picture,
        lyrics: song.lyrics || '',
        audioURL: song.audioURL || '',
      });

      if (recommendations.length >= MAX_RECOMMENDATIONS) break;
    }

    genreRecommendations[genre] = recommendations;
  }

  return genreRecommendations;
}

module.exports = { recommendOnlyNewWords };