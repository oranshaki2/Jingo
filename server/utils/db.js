const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Song = require('../models/song');



/*
  * Resolves the CSV file path from environment variable or defaults.
*/
function resolveCsvPath() {
  const fromEnv = process.env.SONGS_CSV_PATH && String(process.env.SONGS_CSV_PATH).trim();
  if (fromEnv) {
    // Resolve relative to the process working dir (where you run `node app.js`, i.e., /server)
    const abs = path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
    return abs;
  }
  // Fallback to the repo default (resolve relative to the server working dir)
  return path.resolve(process.cwd(), '../data/some_songs.csv');
}

/**
 * Connects to MongoDB using Mongoose.
 */
const connectDB = async () => {
    try {
        const uri = process.env.CONNECTION_STRING || 'mongodb://localhost:27017/jingo_db';
        // Use CONNECTION_STRING as default
        await mongoose.connect(uri);
        console.log('✅ MongoDB connected successfully.');
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error);
        // Throw the error so app.js can handle it
        throw error;
    }
};

/**
 * Parses the CSV file and returns an array of objects ready for insertion.
 */
const parseSongsFromCsv = () => {
    return new Promise((resolve, reject) => {
        const songsToInsert = [];
        
        const csvFilePath = path.resolve(process.cwd(), '../data/some_songs.csv');
        if (!fs.existsSync(csvFilePath)) {
            return reject(new Error(`CSV file not found at: ${csvFilePath}`));
        }

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                try {
                    // The row object will have keys: Song, Artist, Genre, categories, category_words, picture, audioURL, lyrics
                    
                    // Convert array strings to JavaScript arrays
                    const categoriesArray = JSON.parse(row.categories.replace(/'/g, '"'));
                    const categoryWordsArray = JSON.parse(row.category_words.replace(/'/g, '"'));
                    
                    // Parse lyrics only if it exists and is not empty
                    let lyricsArray = [];
                    if (row.lyrics && row.lyrics.trim()) {
                        lyricsArray = JSON.parse(row.lyrics);
                    }
                    
                    songsToInsert.push({
                        name: row.Song.trim(),
                        artist: row.Artist.trim(),
                        genre: row.Genre.trim(),
                        categories: categoriesArray,
                        category_words: categoryWordsArray,
                        picture: row.picture ? row.picture.trim() : '',
                        audioURL: row.audioURL ? row.audioURL.trim() : '',
                        lyrics: lyricsArray,
                    });
                } catch (e) {
                    console.error(`Error parsing data for song: ${row.Song}. Skipping. Error: ${e.message}`);
                }
            })
            .on('end', () => {
                resolve(songsToInsert);
            })
            .on('error', (err) => {
                reject(err);
            });
    });
};

/**
 * Initializes the database with songs from the CSV file.
 */
const initializeDB = async () => {
    
    //Read and parse the CSV file
    const songsData = await parseSongsFromCsv();
    
    

    if (songsData.length === 0) {
        console.log('⚠️ CSV file contained no valid songs to insert.');
        return;
    }

    // Create Bulk Write operations for insert/update
    const bulkOperations = songsData.map(song => ({
        updateOne: {
            filter: { name: song.name },
            update: song,
            upsert: true 
        }
    }));

    // Perform the insertion into the DB
    const result = await Song.bulkWrite(bulkOperations);
    
    console.log(`🎉 Database initialized successfully.`);
};

module.exports = { connectDB, initializeDB };