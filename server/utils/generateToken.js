const jwt = require('jsonwebtoken');

/**
 * Generates JWT Access and Refresh Tokens and sets the refresh token in an HTTP-Only cookie.
 * @param {object} res - The Express response object.
 * @param {string} userId - The ID of the user to embed in the tokens.
 * @returns {string} The generated Access Token.
 */
const generateTokens = (res, userId) => {
    // 1. The "How": Generate the short-lived Access Token (15 minutes)
    // This is what the client will use for authenticating API requests.
    const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '15m',
    });

    // 2. The "How": Generate the long-lived Refresh Token (7 days)
    // This token's only purpose is to get a new access token.
    const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: '7d',
    });

    // 3. The "Why": Store the Refresh Token in an HTTP-Only Cookie
    // We use an HTTP-Only cookie to prevent XSS attacks. JavaScript on the client
    // cannot access this cookie, making it much more secure than localStorage.
    // - httpOnly: true -> Cannot be accessed by client-side scripts.
    // - secure: true -> Only sent over HTTPS (in production).
    // - sameSite: 'strict' -> Helps prevent CSRF attacks.
    // - maxAge: 7 days in milliseconds.
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return only the access token to the client in the JSON response.
    return accessToken;
};

module.exports = generateTokens;
