const mongoose = require('mongoose');

const Schema = mongoose.Schema; 


const song = new Schema({
    name: { // Name of the song
        type: String, 
        required: true,
        unique: true
    },
    artist: { // Artist of the song
        type: String,
        required: true
    },
    genre: { // Genre of the song
        type: String,
        required: true
    },
    categories: {  // Categories the song belongs to
        type: [String],
        required: true
   
    },
    category_words: {  // Words associated with the song's categories
        type: [[String]],
        required: true
    },
    picture: { // URL of the song poster
        type: String,
        default: ''
    },
    audioURL: { // audio of the song
        type: String,
        default: ''
    },
    lyrics : { // Lyrics of the song
        type: String,
        default: ''
    },
    lyricsHebrew : { // Lyrics of the song in Hebrew
        type: String,
        default: ''
    }
}, {versionKey: false}); // Disable the version key from the schema.

// Export the Mongoose model for categories to use it elsewhere in the application.
module.exports = mongoose.model('Song', song);