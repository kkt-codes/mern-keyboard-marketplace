const rateLimit = require('express-rate-limit');

// JSON error bodies matching the rest of the API's { message } shape.
const options = (max, message) => ({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true, // RateLimit-* response headers
    legacyHeaders: false, // no X-RateLimit-*
    message: { message },
    // A test suite makes hundreds of requests from a single address and
    // would start collecting 429s partway through. Skipping here rather
    // than omitting the middleware means the app is wired identically in
    // every environment — the limiter is still mounted, it just doesn't
    // count while testing.
    skip: () => process.env.NODE_ENV === 'test'
});

/**
 * General ceiling for the whole API. Generous enough that normal browsing
 * (product grids, dashboards, silent token refreshes) never hits it — it
 * exists to blunt scraping and runaway scripts, not to police users.
 * NOTE: if deployed behind a reverse proxy (nginx, Render, Railway...),
 * set `app.set('trust proxy', 1)` so the limiter keys on the real client
 * IP instead of the proxy's.
 */
const apiLimiter = rateLimit(
    options(300, 'Too many requests from this IP, please try again in a few minutes')
);

/**
 * Much stricter limit for credential endpoints (login/register) — the
 * target here is password brute-forcing and bulk account creation.
 * 20 attempts per 15 minutes per IP is plenty for real users.
 */
const authLimiter = rateLimit(
    options(20, 'Too many login attempts from this IP, please try again in 15 minutes')
);

module.exports = { apiLimiter, authLimiter };
