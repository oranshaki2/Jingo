const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

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

          const song = {
            title: row.Song,
            artist: row.Artist,
            genre: row.Genre,
            categories,
            categoryWords,
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
 */

function filterWordsByHistory(categoryWords, userHistory) {
  const newWords = [];

  for (const wordList of categoryWords) {
    
    const words = wordList.slice(0, -1); 
    const unseenWords = words.filter(word => !userHistory.includes(word));
    newWords.push(...unseenWords);
  }

  return [...new Set(newWords)];
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
      if (!song.categories.includes(selectedCategory)) continue;
      if (song.genre.toLowerCase() !== genre.toLowerCase()) continue;

      const newWords = filterWordsByHistory(song.categoryWords, user.history);

      if (newWords.length > 1) {
        recommendations.push({
          title: song.title,
          artist: song.artist,
          genre: song.genre,
          newWords,
        });
      }

      if (recommendations.length >= 20) break;
    }

    genreRecommendations[genre] = recommendations;
  }

  return genreRecommendations;
}


module.exports = { recommendOnlyNewWords };