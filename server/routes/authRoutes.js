const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getUserProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// The "Why": We've added the new endpoints to our router.
// /refresh is for the silent-refresh flow.
// /logout is to provide a secure way to end the session.
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/refresh', refreshAccessToken);
router.get('/profile', protect, getUserProfile);

module.exports = router;
