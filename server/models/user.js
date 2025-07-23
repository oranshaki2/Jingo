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

  wordHistory: {
    type: [
      {
        words: [String],
        _id: false
      }
    ],
    default: []
  },

  mistakes: {
    type: [
      {
        words: [String],
        _id: false
      }
    ],
    default: []
  },

  favorites: {
    type: [
      {
        title: String,
        artist: String,
        _id: false
      }
    ],
    default: []
  }
});

module.exports = mongoose.model("User", userSchema);
