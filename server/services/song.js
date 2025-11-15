const Song = require('../models/song');
// const axios = require('axios');
// const net = require('net');
const mongoose = require('mongoose');

// Create a new song
const createSong = async (name, artist, genre, categories, category_words, picture, audioURL, lyrics, lyricsHebrew) => {
    const song = new Song({
        name,
        artist,
        genre,
        categories,
        category_words,
        picture,
        audioURL,
        lyrics,
        lyricsHebrew
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

module.exports = {
    createSong,
    getSongs,
    getSongById
};