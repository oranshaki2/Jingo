// Import Express for routing
const express = require('express'); 
// Create a new router instance
const router = express.Router(); 
// Import the user controller
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
router.get('/:username', userController.checkUsernameAvailability);
// router.route('/')
//     .post(userController.createUser);

router.route('/:id')
    .get(userController.getUserById)
    //.patch(userController.updateUser)
    //.delete(userController.deleteUser);

// Export the router to use it in the app
module.exports = router;