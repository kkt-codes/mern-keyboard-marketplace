const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { apiLimiter } = require('./middleware/rateLimiters');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const userRoutes = require('./routes/userRoutes');
const cartRoutes = require('./routes/cartRoutes');
const { stripeWebhookHandler } = require('./controllers/orderController');

/**
 * The Express app, with no database connection and no listening socket.
 *
 * Kept separate from server.js so tests can drive it through supertest
 * against a throwaway in-memory database, without binding a port or
 * touching the real one. server.js is the only thing that does either.
 */
const app = express();

// Managed hosts put a load balancer in front of the app, so the socket's
// remote address is the proxy's, not the visitor's. Without this the
// per-IP rate limiters would treat the entire internet as a single client
// and one attacker could lock everyone out.
//
// Deliberately opt-in rather than always-on: trusting X-Forwarded-For when
// nothing is actually in front of the app lets anyone forge that header and
// hand themselves a fresh rate-limit bucket per request. 0 (the default)
// means "trust nobody"; set TRUST_PROXY=1 when deploying behind one proxy.
app.set('trust proxy', Number(process.env.TRUST_PROXY) || 0);

// Security response headers (X-Content-Type-Options, X-Frame-Options,
// HSTS, etc.). The default Content-Security-Policy is API-appropriate and
// still lets the same-origin Swagger UI at /api-docs load its own assets.
app.use(helmet());

// The Stripe webhook needs the raw, unparsed request body to verify the
// signature — it must be mounted with express.raw() BEFORE the global
// express.json() below, or that middleware would already have consumed
// (and reformatted) the body by the time this route sees it. It's also
// mounted before the rate limiter: Stripe's retries authenticate via
// signature, and dropping one with a 429 could lose a payment event.
app.post('/api/orders/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

// General per-IP rate limit for everything under /api (a stricter one for
// login/register lives in routes/authRoutes.js).
app.use('/api', apiLimiter);

// Middleware
app.use(express.json()); // Body parser for JSON data
app.use(cookieParser()); // Parses the Cookie header into req.cookies (needed for the refresh token)
app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true, // Allows the refreshToken cookie to be sent/received cross-origin
    })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);

// Cheap unauthenticated liveness probe for the host's health checks. Kept
// under /api so the SPA fallback below never shadows it.
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// API docs, generated from the @swagger JSDoc blocks in ./routes/*.js.
// Left publicly reachable on purpose: this is a portfolio project, and the
// documented API is part of what it's showing off. Nothing here leaks — the
// endpoints enforce their own auth, and the spec contains no secrets.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Anything under /api that got this far doesn't exist. Without this, unknown
// API paths would fall through to the SPA and return an HTML page with a 200,
// which is a genuinely confusing thing to debug from the client side.
app.use('/api', (req, res) => {
    res.status(404).json({ message: `Not found: ${req.method} /api${req.url}` });
});

// In production the API also serves the built frontend, so both live on one
// origin. That's what keeps the client's relative `/api` base URL working
// without a dev proxy, and lets the refresh cookie stay SameSite=Strict.
const clientDist = path.join(__dirname, '..', 'client', 'dist');

if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist));

    // Every remaining GET is a client-side route, so hand back the shell and
    // let React Router sort it out. Without this a hard load of a deep link
    // 404s — including /order/:id, which is exactly where Stripe sends people
    // back to after payment.
    app.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        res.sendFile(path.join(clientDist, 'index.html'));
    });
} else {
    // No build present (dev, or tests) — just report that the API is up.
    app.get('/', (req, res) => {
        res.send('API is running...');
    });
}

module.exports = app;
