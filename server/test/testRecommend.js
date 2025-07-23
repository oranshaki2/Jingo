const path = require('path');
const { recommendOnlyNewWords } = require('../recommender/recommendOnlyNew');

const user = {
  history: ['love', 'hate', 'baby', 'boots','ticket'], 
  genre: ['Pop' , 'Rock'],
  level: 2,
};
category =  'Emotions'; // Example category, can be 'Emotions', 'Travel', etc.

// const csvPath = path.join(__dirname, '../../data/merged_song_with_level.csv') 
const csvPath = path.join(__dirname, '../../data/song.csv'); 

recommendOnlyNewWords(csvPath, user, category)
  .then((genreResults) => {
    console.log('🎵 Recommended songs by genre:');
    for (const [genre, songs] of Object.entries(genreResults)) {
      console.log(`\n🎧 Genre: ${genre}`);
      songs.forEach((song, i) => {
        console.log(`${i + 1}. ${song.title} by ${song.artist}`);
        console.log(`   ➤ New words: ${song.newWords.join(', ')}`);
      });
    }
  })
  .catch((err) => {
    console.error('Error:', err);
  });


