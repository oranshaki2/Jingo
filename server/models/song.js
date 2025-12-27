const mongoose = require('mongoose');

const Schema = mongoose.Schema; 

const lyricSchema = new mongoose.Schema({
  english: String,
  hebrew: String
}, { _id: false });

const song = new Schema({
    name: { // Name of the song
        type: String, 
        required: true,
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
    lyrics: {
    type: [lyricSchema],
    default: []
    }

}, {versionKey: false}); // Disable the version key from the schema.

// Create a compound unique index on name + artist
song.index({ name: 1, artist: 1 }, { unique: true });

// Export the Mongoose model for categories to use it elsewhere in the application.
module.exports = mongoose.model('Song', song);