const express = require('express'); // Import Express for routing.
const router = express.Router(); // Create a new router instance.
const tokenController = require('../controllers/token'); // Import the token controller.

// Define the route for getting recommendations and creating a new recommendation.    
router.route('/')
    .post(tokenController.checkIfUserRegistered);

// Export the router to use it in the app.
module.exports = router;
