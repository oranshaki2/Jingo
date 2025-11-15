// services/recommendOnlyNew.js
const Song = require('../models/song');

/**
 * קורא את כל השירים מה-DB
 */
const getSongsFromDB = async () => {
  return await Song.find().lean(); // .lean() כדי לקבל אובייקטים רגילים
};

/**
 * מנרמל תמונה (אם לא URL)
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
 * בוחר את רשימת המילים לקטגוריה
 */
function pickWordsForCategory(song, selectedCategory) {
  if (!song || !Array.isArray(song.categories) || !Array.isArray(song.category_words)) return null;

  const wanted = String(selectedCategory || '').trim().toLowerCase();
  const idx = song.categories.findIndex(
    (c) => String(c || '').trim().toLowerCase() === wanted
  );

  if (idx === -1) return null;
  return song.category_words[idx]; // ← כאן השתנה!
}

/**
 * מסנן מילים חדשות – תומך ב-level כמחרוזת
 */
function filterWordsByHistory(singleCategoryWordList, userHistory, userLevel) {
  if (!Array.isArray(singleCategoryWordList) || singleCategoryWordList.length === 0) return [];

  const maybeLevel = singleCategoryWordList[singleCategoryWordList.length - 1];
  const level = Number(maybeLevel); // ← הופך '1' → 1

  if (!Number.isFinite(level) || level !== Number(userLevel)) return [];

  const words = singleCategoryWordList.slice(0, -1).map(w => String(w));
  const history = Array.isArray(userHistory) ? userHistory.map(w => String(w)) : [];

  const unseen = words.filter(w => !history.includes(w));
  return [...new Set(unseen)];
}

/**
 * ממליץ שירים עם מילים חדשות
 */
async function recommendOnlyNewWords(user, selectedCategory) {
  const allSongs = await getSongsFromDB();
  console.log(`Loaded ${allSongs.length} songs from DB.`);

  const genreRecommendations = {};

  for (const genre of user.genre) {
    const recommendations = [];

    for (const song of allSongs) {
      // 1. התאמת ז'אנר (case-insensitive)
      if (String(song.genre || '').trim().toLowerCase() !== String(genre || '').trim().toLowerCase()) {
        continue;
      }

      // 2. האם יש את הקטגוריה?
      const hasCategory = Array.isArray(song.categories) && song.categories.some(
        c => String(c || '').trim().toLowerCase() === String(selectedCategory).trim().toLowerCase()
      );
      if (!hasCategory) continue;

      // 3. קבלת רשימת מילים לקטגוריה
      const listForCategory = pickWordsForCategory(song, selectedCategory);
      if (!listForCategory) continue;

      // 4. סינון מילים חדשות
      const newWords = filterWordsByHistory(listForCategory, user.wordHistory || [], user.level);
      if (newWords.length <= 1) continue; // דורש לפחות 2 מילים חדשות

      // 5. נירמול תמונה
      let picture = song.picture;
      if (picture && !/^https?:\/\//i.test(picture)) {
        picture = normalizePictureKey(picture);
      }

      // 6. הוספת שיר
      recommendations.push({
        title: song.name,           // ← כאן השתנה מ-title ל-name
        artist: song.artist,
        genre: song.genre,
        newWords,
        picture,
        lyrics: song.lyrics || '',
        audioURL: song.audioURL || '',
      });

      if (recommendations.length >= 20) break;
    }

    genreRecommendations[genre] = recommendations;
  }

  return genreRecommendations;
}

module.exports = { recommendOnlyNewWords };