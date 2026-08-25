const { request, app, registerUser } = require('./helpers');
const stripe = require('../config/stripe');

/**
 * Guards the test harness itself. If any of these fail, every other result
 * in the suite is suspect — they'd be running against the wrong app, the
 * wrong database, or the real Stripe.
 */
describe('test harness', () => {
    it('serves the app without binding a port', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
    });

    it('is backed by a real database, not a mock', async () => {
        const { token, user } = await registerUser({ email: 'smoke@example.com' });
        expect(token).toBeTruthy();
        expect(user.email).toBe('smoke@example.com');
    });

    it('resolves Stripe to the local fake, so no test can reach the network', async () => {
        const session = await stripe.checkout.sessions.create({});
        expect(session.id).toMatch(/^cs_test_/);
        expect(stripe.__getSession(session.id).status).toBe('open');
    });

    it('starts each test with an empty database', async () => {
        // The user registered above must not survive into this test.
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'smoke@example.com', password: 'password123' });

        expect(res.status).toBe(401);
    });
});
