const User = require('../models/User');
const jwt = require('jsonwebtoken');
const generateTokens = require('../utils/generateToken');
const sendError = require('../utils/sendError');

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

        // Self-registration may only grant 'buyer' or 'seller' — never trust
        // a client-supplied role directly, or anyone could POST role: 'admin'.
        const allowedRole = role === 'seller' ? 'seller' : 'buyer';
        const user = await User.create({ name, email, password, role: allowedRole });

        if (user) {
            // The "Why": We now separate token generation.
            // The `generateTokens` utility handles creating BOTH tokens
            // and crucially, it sets the httpOnly refresh token cookie on the `res` object.
            const accessToken = generateTokens(res, user._id, user.tokenVersion);

            // The "Why": This is our Data Transfer Object (DTO).
            // We are explicitly controlling what data is sent to the client.
            // Notice we only send the `accessToken`, not the refresh token.
            res.status(201).json(toUserDTO(user, accessToken));
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        sendError(res, error);
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
            const accessToken = generateTokens(res, user._id, user.tokenVersion);
            res.status(200).json(toUserDTO(user, accessToken));
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        sendError(res, error);
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

        // A password change or "log out other devices" bumps tokenVersion,
        // which makes every refresh token issued before that moment stale —
        // this is the only way to revoke a JWT that's self-verifying otherwise.
        if (decoded.tokenVersion !== user.tokenVersion) {
            return res.status(401).json({ message: 'Session expired, please log in again' });
        }

        // The "Why": If the refresh token is valid, we issue a NEW access token,
        // but we do NOT issue a new refresh token. The existing one remains valid
        // until its original expiry.
        const accessToken = jwt.sign({ id: user._id, tokenVersion: user.tokenVersion }, process.env.JWT_SECRET, {
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
                createdAt: user.createdAt,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * @desc    Update the logged-in user's name/email
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { name, email } = req.body;

        if (email && email !== user.email) {
            const emailTaken = await User.findOne({ email });
            if (emailTaken) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            user.email = email;
        }

        if (name) {
            user.name = name;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            createdAt: updatedUser.createdAt,
        });
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * @desc    Change the logged-in user's password
 * @route   PUT /api/auth/password
 * @access  Private
 * @note    Doesn't revoke other sessions — refresh tokens are stateless JWTs
 *          with no server-side session store to invalidate, so one issued
 *          before this change stays valid until it naturally expires (7d).
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        // select('+password') is required — the schema excludes it by default.
        const user = await User.findById(req.user._id).select('+password');

        if (!(await user.matchPassword(currentPassword))) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ message: 'New password must be different from the current one' });
        }

        // Plain assignment — the pre-save hook hashes it because
        // isModified('password') is true, same as registration.
        user.password = newPassword;

        // Changing your password is the moment you'd most want any stolen
        // session killed, so bump tokenVersion in the same save — every
        // refresh token issued before now (on any device) stops working.
        user.tokenVersion += 1;
        await user.save();

        // Without this, the request that just changed the password would
        // itself be logged out next time its own token needed refreshing.
        const accessToken = generateTokens(res, user._id, user.tokenVersion);

        res.json({ message: 'Password updated', accessToken });
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * @desc    Revoke every session except the one making this request
 * @route   POST /api/auth/logout-others
 * @access  Private
 * @note    Same tokenVersion-bump mechanism as changePassword, offered on
 *          its own for "I think someone else is logged into my account"
 *          without needing to also change the password.
 */
const logoutOtherSessions = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        user.tokenVersion += 1;
        await user.save();

        const accessToken = generateTokens(res, user._id, user.tokenVersion);

        res.json({ message: 'Logged out of all other sessions', accessToken });
    } catch (error) {
        sendError(res, error);
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getUserProfile,
    updateUserProfile,
    changePassword,
    logoutOtherSessions,
};
