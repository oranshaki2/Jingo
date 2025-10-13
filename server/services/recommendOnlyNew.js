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

/** Extracts the relative path of an asset from a full local file path.
 * If the path does not contain "assets/", it returns just the filename.
 */

function extractAssetsRelative(localPath) {
  if (!localPath) return null;
  const norm = String(localPath).replace(/\\/g, '/'); 
  const marker = '/assets/';
  const i = norm.toLowerCase().lastIndexOf(marker);
  // If we didn't find "assets/", fallback to just the filename
  return i !== -1 ? norm.slice(i + marker.length) : path.basename(norm);
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
          const rawPicture = row.picture || row.Picture || null;
          const relFromAssets = rawPicture ? extractAssetsRelative(rawPicture) : null;
          const pictureUrl = relFromAssets ? publicAssetUrl(relFromAssets) : null;

          const song = {
            title: row.Song || row['\uFEFFSong'],
            artist: row.Artist,
            genre: row.Genre,
            categories,
            categoryWords,
            picture: pictureUrl,
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
 * Recommends up to 20 songs per genre for the user.
 * Only includes songs from a selected category that contain new vocabulary
 * not previously encountered by the user.
 */
async function recommendOnlyNewWords(csvPath ='../../data/someSongs.csv', user, selectedCategory) {
  const allSongs = await loadSongsFromCSV(csvPath);
  const genreRecommendations = {};

  for (const genre of user.genre) {
    const recommendations = [];

    for (const song of allSongs) {
      if (!song.categories.includes(selectedCategory)) continue;
      if (song.genre.toLowerCase() !== genre.toLowerCase()) continue;

      const newWords = filterWordsByHistory(song.categoryWords, user.wordHistory, user.level);

      if (newWords.length > 1) {
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