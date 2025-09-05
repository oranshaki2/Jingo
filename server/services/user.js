const User = require('../models/user');

// Create a new user
const createUser = async ({ username, password, picture, genres, level }) => {
    const user = new User({
        username,
        password,
        picture,
        genres,
        level,
        wordHistory: [],
        mistakes: [],
        favorites: [],
    });

    await user.save();
    return user;
};

// Get user's details by id
const getUserById = async (id) => {
    return await User.findById(id);
};

// Get user's details by username
const getUserByUsername = async (username) => {
    return await User.findOne({ username });
};

const getAllUsers = async () => {
    return await User.find({});
};

// Update user's favorite songs- If the song already exists, delete it, otherwise add it
const updateUserFavorites = async (user, song) => {
    if (!user) {
        throw new Error('User not found');
    }

    const favoriteIndex = user.favorites.findIndex(fav => fav.title === song.title && fav.artist === song.artist);
    if (favoriteIndex > -1) {
        user.favorites.splice(favoriteIndex, 1);
    } else {
        user.favorites.push(song);
    }

    await user.save();
};

// Update user's level
const updateUserLevel = async (user, level) => {
    if (!user) {
        throw new Error('User not found');
    }

    user.level = level;
    await user.save();
};

// Update user's genres
const updateUserGenres = async (user, genres) => {
    if (!user) {
        throw new Error('User not found');
    }

    user.genres = genres;
    await user.save();
};

// Update word history and mistakes
const updateHistoryAndMistakes = async (user, correctWords, mistakenWords) => {
  if (!user) {
    throw new Error("User not found");
  }

  // קבל את הרשימות הנוכחיות
  let existingCorrect = new Set(user.wordHistory.flatMap(entry => entry.words));
  let existingMistakes = new Set(user.mistakes.flatMap(entry => entry.words));

  // הסר מילים שהתבלבלו ביניהן
  mistakenWords.forEach(word => existingCorrect.delete(word));
  correctWords.forEach(word => existingMistakes.delete(word));

  // הוסף את המילים החדשות לרשימות הקיימות
  correctWords.forEach(word => existingCorrect.add(word));
  mistakenWords.forEach(word => existingMistakes.add(word));

  // עדכן את המשתמש עם רשימות חדשות בפורמט של [{ words: [...] }]
  user.wordHistory = [{ words: Array.from(existingCorrect) }];
  user.mistakes = [{ words: Array.from(existingMistakes) }];

  await user.save();
};


module.exports = {
    createUser,
    getUserById,
    getUserByUsername,
    getAllUsers,
    updateUserFavorites,
    updateUserLevel,
    updateUserGenres,
    updateHistoryAndMistakes,
};