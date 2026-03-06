// server/controllers/user.js
const userService = require('../services/user');

const MIN_PASSWORD_LENGTH = 8;

const createUser = async (req, res) => {
  try {
    // Parse JSON only if it's a string
    const userData = typeof req.body.user === "string" ? JSON.parse(req.body.user) : req.body;

    const { username, password, genres, level } = userData;


    // Validate required fields
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ errors: [`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`] });
    }

    // Create the user
    const user = await userService.createUser({
      username,
      password,
      genres,
      level,
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

const updateUserFavorites = async (req, res) => {
  try {
    const { id } = req.params; 
    const { songId } = req.body; 

    if (!songId) {
      return res.status(400).json({ error: 'songId is required' });
    }

    await userService.updateUserFavorites(id, songId);
    res.status(200).json({ message: 'Favorites updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update favorites' });
  }
};

const updateUserLevel = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    const { level } = req.body;
    await userService.updateUserLevel(user, level);
    res.status(200).json({ message: 'Level updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update level' });
  }
};

const updateUserGenres = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    const { genres } = req.body;
    await userService.updateUserGenres(user, genres);
    res.status(200).json({ message: 'Genres updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update genres' });
  }
};

const updateHistoryAndMistakes = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    const { correctWords, mistakenWords } = req.body;
    await userService.updateHistoryAndMistakes(user, correctWords, mistakenWords);
    res.status(200).json({ message: 'History updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update word history' });
  }
};

const checkUsernameAvailability = async (req, res) => {
    try {
    const { username } = req.params;
    // Use the service function to get user by username
    const user = await userService.getUserByUsername(username);

    if (!user) {
      return res.status(404).json({ exists: false });
    }
    return res.status(200).json({ exists: true, username });
  } catch (err) {
    console.error('checkUsernameAvailability error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

module.exports = {
    createUser,
    getUserById,
    updateUserFavorites,
    updateUserLevel,
    updateUserGenres,
    updateHistoryAndMistakes,
    checkUsernameAvailability
};