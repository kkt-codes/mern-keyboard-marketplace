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

// API docs, generated from the @swagger JSDoc blocks in ./routes/*.js
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
    res.send('API is running...');
});

module.exports = app;
