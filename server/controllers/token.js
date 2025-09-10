const tokenService = require('../services/token');
const jwt = require('jsonwebtoken'); // Import JWT

const checkIfUserRegistered = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await tokenService.getUserByUserNameAndPassword(username, password);
        if (!user) return res.status(401).json({ errors: ['Invalid username or password'] });

        if (user) {
             const token = jwt.sign(
                {sub: String(user._id || user.id), username: user.username, picture: user.picture }, // Payload
                process.env.JWT_SECRET, // Secret key from your .env
                { expiresIn: '1h' } // Token expiration
            );
            const userPublic = {
            id: String(user._id || user.id),
            username: user.username,
            level: user.level,
            genres: user.genres,
            picture: user.picture,
            wordHistory: user.wordHistory,
            mistakes: user.mistakes,
            favorites: user.favorites
        };
            // Send the token and user information to the client
            return res.status(200).json({ token, user: userPublic });
        } else {
            return res.status(401).json({ errors: ['Invalid username or password'] });
        }
    } catch (error) {
        console.error('Error in checkIfUserRegistered:', error); // Log the error
        return res.status(500).json({ errors: ['Server error'] });
    }
};

module.exports = { checkIfUserRegistered };