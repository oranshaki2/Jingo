const jwt = require('jsonwebtoken');

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
const authenticateManager = async (req, res, next) => {
    const token = req.headers['x-user-id'];
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || !user.manager) {
            return res.status(403).json({ message: 'Access denied. Not authorized.' });
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};

module.exports = authenticateToken, authenticateManager;
