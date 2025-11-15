const Song= require('../models/song');
const songService = require('../services/song');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const User = require('../models/user');



// Create a new song
const createSong = async (req, res) => {
    
    const { name, artist, genre, categories, category_words, picture, audioURL, lyrics} = req.body;

    const song = await songService.createSong(name, artist, genre, categories, category_words, picture, audioURL, lyrics);
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

const getFavoriteSuggestions = async (req, res) => {
    const userId = req.headers['x-user-id'];
    const songId = req.params.id;
    if (!userId) {
        return res.status(400).json({ errors: ['User ID is required'] });
    }

    // verify user exists
    const existingUser = await User.findById(userId).select('_id').lean();
    if (!existingUser) {
        return res.status(404).json({ errors: ['User ID not exist'] });
    }

    // call the correct service function
    try {
        const recommendations = await songService.getFavoriteSuggestions(userId, songId);
        return res.status(200).json(recommendations);
    } catch (err) {
        // minimal error response
        return res.status(500).json({ errors: ['Internal server error'] });
    }
};

module.exports = {
    createSong,
    getSongs,
    getSongById,
    getFavoriteSuggestions
};