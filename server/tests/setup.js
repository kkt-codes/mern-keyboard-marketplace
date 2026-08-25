const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const stripeMock = require('./mocks/stripe');

// Set before anything requires a module that reads these at load time.
// Tests deliberately do NOT read the real .env — the suite must pass on a
// fresh clone with no secrets configured, and must never reach a real service.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_tests';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_secret';
process.env.CLIENT_URL = 'http://localhost:5173';

/**
 * Swap in the Stripe fake by seeding Node's module cache.
 *
 * This app is CommonJS, so the server code reaches Stripe through a plain
 * `require()` resolved by Node — which sits outside Vitest's module graph.
 * Neither `vi.mock` nor a Vite alias intercepts it (both were tried; the
 * real SDK still loaded and attempted a network call). Pre-populating
 * require.cache here, before any test file pulls in the app, is the one
 * mechanism that actually owns that resolution.
 */
const stripeConfigPath = require.resolve('../config/stripe');
require.cache[stripeConfigPath] = {
    id: stripeConfigPath,
    filename: stripeConfigPath,
    loaded: true,
    exports: stripeMock,
    children: [],
    paths: []
};

let mongo;

beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
});

// A clean database per test keeps them order-independent — no test can pass
// only because an earlier one happened to leave the right data behind.
afterEach(async () => {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
    stripeMock.__reset();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
