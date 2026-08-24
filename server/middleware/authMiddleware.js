const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            // No user (deleted account) or a stale tokenVersion (password
            // change / "log out other devices" happened since this access
            // token was issued) — either way, this token no longer counts.
            if (!req.user || decoded.tokenVersion !== req.user.tokenVersion) {
                return res.status(401).json({ message: 'Session expired, please log in again' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

/**
 * Middleware factory that restricts a route to specific user roles.
 * Must run after `protect`, which populates `req.user`.
 * @param {...string} roles - Roles allowed to access the route (e.g. 'seller', 'admin').
 * @returns {Function} Express middleware.
 */
const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized for this action' });
    }
    next();
};

module.exports = { protect, authorize };
