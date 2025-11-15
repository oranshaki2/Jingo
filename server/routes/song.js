const express = require('express'); // Import Express for routing.
const router = express.Router(); // Create a new router instance.
const songController = require('../controllers/song'); // Import the movie controller.

router.route('/')
    .get(songController.getSongs)  // Get songs.
    .post(songController.createSong); // Create a new song 

router.route('/:id')
    .get(songController.getSongById); // Get a specific song by ID.

// Export the router to use it in the app.
module.exports = router;