const Song= require('../models/song');
const songService = require('../services/song');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();



// Create a new song
const createSong = async (req, res) => {
    
    const { name, artist, genre, categories, category_words, picture, audioURL, lyrics, lyricsHebrew} = req.body;

    const song = await songService.createSong(name, artist, genre, categories, category_words, picture, audioURL, lyrics, lyricsHebrew );
    res.status(201).send();
};


// Get all songs
const getSongs = async (req, res) => {
    const songs = await songService.getSongs();
    res.json(songs);
};

// Get a specific song by ID
const getSongById = async (req, res) => {
    const song = await songService.getSongById(req.params.id);
    if (!song) {
        return res.status(404).json({ errors: ['Song not found'] });
    }
    res.json(song);
};

module.exports = {
    createSong,
    getSongs,
    getSongById
};