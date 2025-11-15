// server/routes/user.js
const express = require('express'); 
const router = express.Router(); 
const multer = require('multer');
const userController = require('../controllers/user');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'profilePics/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    },
});

const upload = multer({ storage: storage });

router.post('/', upload.single('picture'), userController.createUser);

router.route('/:id')
    .get(userController.getUserById)
router.get('/by-username/:username', userController.checkUsernameAvailability);

router.patch('/:id/favorites', userController.updateUserFavorites);
router.patch('/:id/level', userController.updateUserLevel);
router.patch('/:id/genres', userController.updateUserGenres);
router.patch('/:id/history', userController.updateHistoryAndMistakes);

// Export the router to use it in the app
module.exports = router;