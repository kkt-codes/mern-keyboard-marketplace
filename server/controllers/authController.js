const User = require('../models/User');
const jwt = require('jsonwebtoken');
const generateTokens = require('../utils/generateToken');

// DTO for User Response
const toUserDTO = (user, accessToken) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    accessToken, // The short-lived access token
});


/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 * @returns {object} User DTO and sets refreshToken cookie.
 */
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({ name, email, password, role });

        if (user) {
            // The "Why": We now separate token generation.
            // The `generateTokens` utility handles creating BOTH tokens
            // and crucially, it sets the httpOnly refresh token cookie on the `res` object.
            const accessToken = generateTokens(res, user._id);

            // The "Why": This is our Data Transfer Object (DTO).
            // We are explicitly controlling what data is sent to the client.
            // Notice we only send the `accessToken`, not the refresh token.
            res.status(201).json(toUserDTO(user, accessToken));
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Auth user & get tokens
 * @route   POST /api/auth/login
 * @access  Public
 * @returns {object} User DTO and sets refreshToken cookie.
 */
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            const accessToken = generateTokens(res, user._id);
            res.status(200).json(toUserDTO(user, accessToken));
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Logout user and clear cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logoutUser = (req, res) => {
    // The "How": To logout, we just need to invalidate the refresh token.
    // We do this by replacing the cookie with an empty one that expires immediately.
    res.cookie('refreshToken', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({ message: 'Logged out successfully' });
};


/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public (requires a valid refresh token cookie)
 * @returns {object} A new accessToken.
 */
const refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: 'Not authorized, no refresh token' });
        }

        // The "How": We verify the incoming refresh token against our secret.
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Find the user from the token's payload.
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // The "Why": If the refresh token is valid, we issue a NEW access token,
        // but we do NOT issue a new refresh token. The existing one remains valid
        // until its original expiry.
        const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '15m',
        });

        res.status(200).json({ accessToken });

    } catch (error) {
        // This will catch expired tokens or invalid signatures.
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};


/**
 * @desc    Get user profile
 * @route   GET /api/auth/profile
 * @access  Private (requires a valid access token)
 */
const getUserProfile = async (req, res) => {
    try {
        // req.user is populated by the `protect` middleware from the access token
        const user = await User.findById(req.user._id);

        if (user) {
            // We don't need to send the token here.
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getUserProfile,
};
