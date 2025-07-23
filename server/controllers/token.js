const tokenService = require('../services/token');
const jwt = require('jsonwebtoken'); // Import JWT

const checkIfUserRegistered = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await tokenService.getUserByUserNameAndPassword(username, password);

        if (user) {
             const token = jwt.sign(
                { username: user.username, picture: user.picture }, // Payload
                process.env.JWT_SECRET, // Secret key from your .env
                { expiresIn: '1h' } // Token expiration
            );

            // Send the token to the client
            return res.status(200).json({ token });
        } else {
            return res.status(401).json({ errors: ['Invalid username or password'] });
        }
    } catch (error) {
        console.error('Error in checkIfUserRegistered:', error); // Log the error
        return res.status(500).json({ errors: ['Server error'] });
    }
};

module.exports = { checkIfUserRegistered };