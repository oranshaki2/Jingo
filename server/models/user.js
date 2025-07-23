const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  picture: {
    type: String,
    default: 'default.jpg',
  },
  genres: {
    type: [String],
    default: [],
    required: true,
  }, 
  difficultyLevel: {
    type: Number,
    required: true,
  },
  wordHistory: [
    {
      words: [String],
      default: [],
    }
  ],
  mistakes: [
    {
      words: [String],
      default: [],
    }
  ],
  favorites: [
    {
      title: String,
      artist: String,
      default: [],
    }
  ],
});

module.exports = mongoose.model("User", userSchema);