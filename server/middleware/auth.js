const jwt = require('jsonwebtoken');

/* Middleware to authenticate JWT tokens 
This middleware checks for the presence of a JWT token in the 'x-user-id' header, 
verifies it, and attaches the decoded user information to the request object.
 If the token is missing or invalid, it responds with an appropriate error message and status code.
*/
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['x-user-id'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ errors: ['Access token is missing'] });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ errors: ['Invalid or expired token'] });
        }

        req.user = user; // Attach user info to the request
        next();
    });
};

module.exports = authenticateToken;
