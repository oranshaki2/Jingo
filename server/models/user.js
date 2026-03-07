// server/models/user.js
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
  genres: {
    type: [String],
    default: [],
    required: true,
  },
  level: {
    type: Number,
    required: true,
  },

  wordHistory: {
    type: [String],
    default: []
  },

  mistakes: {
    type: [String],
    default: []
  },
  // List of song IDs the user has learned.
  favorites: {
    type: [String], 
    default: []
  }
});

module.exports = mongoose.model("User", userSchema);
