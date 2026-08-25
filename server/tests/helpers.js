const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Product = require('../models/Product');
const stripeMock = require('./mocks/stripe');

const SHIPPING = { address: '1 Test St', city: 'Testville', postalCode: '00000', country: 'Testland' };

/**
 * Registers a user through the real endpoint and returns their token.
 * Going through the API rather than inserting directly means tests exercise
 * password hashing and token issuing the same way production does.
 */
const registerUser = async ({ name = 'Test User', email, password = 'password123', role } = {}) => {
    const res = await request(app)
        .post('/api/auth/register')
        .send({ name, email: email || `user-${Math.random().toString(36).slice(2)}@example.com`, password, role });

    return { token: res.body.accessToken, user: res.body, password, email: res.body.email };
};

/** Creates an admin. Registration can't self-assign admin, so promote directly. */
const registerAdmin = async (overrides = {}) => {
    const created = await registerUser({ name: 'Admin User', ...overrides });
    await User.findByIdAndUpdate(created.user._id, { role: 'admin' });

    // Re-login so the token carries the promoted role's context.
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email: created.email, password: created.password });

    return { ...created, token: res.body.accessToken };
};

/** Inserts a product directly — most tests care about orders, not listing flow. */
const createProduct = async (sellerId, overrides = {}) =>
    Product.create({
        name: `Test Board ${Math.random().toString(36).slice(2)}`,
        price: 100,
        user: sellerId,
        image: 'https://example.com/board.jpg',
        brand: 'TestCo',
        category: 'Mechanical',
        countInStock: 10,
        description: 'A test keyboard',
        ...overrides
    });

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

/** Places an order via the API, which is where price recalculation happens. */
const createOrder = (token, orderItems) =>
    request(app)
        .post('/api/orders')
        .set(authHeader(token))
        .send({ orderItems, shippingAddress: SHIPPING, paymentMethod: 'Stripe' });

/**
 * Fires a properly signed Stripe webhook at the app, exactly as Stripe would.
 * The signature is real, so this also proves the endpoint's verification works.
 */
const sendWebhook = (type, dataObject) => {
    const payload = JSON.stringify({
        id: `evt_test_${Math.random().toString(36).slice(2)}`,
        object: 'event',
        type,
        data: { object: dataObject }
    });

    const signature = stripeMock.webhooks.generateTestHeaderString({
        payload,
        secret: process.env.STRIPE_WEBHOOK_SECRET
    });

    return request(app)
        .post('/api/orders/webhook')
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);
};

module.exports = {
    app,
    request,
    SHIPPING,
    registerUser,
    registerAdmin,
    createProduct,
    createOrder,
    authHeader,
    sendWebhook
};
