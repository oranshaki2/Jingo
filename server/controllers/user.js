const userService = require('../services/user');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Get the path to the directory containing the profile pictures
const pictureDirectory = path.join(__dirname, '../profilePics');

// Load the list of picture files once
const pictureFiles = fs.readdirSync(pictureDirectory).filter(file => file.endsWith('.jpg'));

const createUser = async (req, res) => {
  try {
    // Parse JSON only if it's a string
    const userData = typeof req.body.user === "string" ? JSON.parse(req.body.user) : req.body;

    const { username, password, genres, difficultyLevel } = userData;

    // הגדרת תמונה
    const picture = req.file ? req.file.path : 'default.jpg';

    // בדיקת סיסמה תקינה
    if (!password || password.length < 8) {
      return res.status(400).json({ errors: ['Password must be at least 8 characters long.'] });
    }

    // יצירת משתמש חדש עם ברירת מחדל לשדות שלא סופקו
    const user = await userService.createUser({
      username,
      password,
      picture,
      genres,
      difficultyLevel,
      wordHistory: [],
      mistakes: [],
      favorites: [],
    });

    res.status(201).send();
  } catch (err) {
    console.error("Error in createUser:", err);
    res.status(500).json({ errors: ['Server error'] });
  }
};


const getUserById = async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ errors: ['User not found'] });
        }
        res.json(user);
    } catch (error) {
        res.status(404).json({ errors: ['User not found'] });
    }
}

module.exports = {
    createUser,
    getUserById,
};