const { request, app, registerUser, authHeader } = require('./helpers');

const login = (email, password) =>
    request(app).post('/api/auth/login').send({ email, password });

describe('registration', () => {
    it('creates a user and returns an access token', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'New Buyer', email: 'buyer@example.com', password: 'password123' });

        expect(res.status).toBe(201);
        expect(res.body.accessToken).toBeTruthy();
        expect(res.body.role).toBe('buyer');
    });

    it('never returns the password hash', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'New Buyer', email: 'buyer@example.com', password: 'password123' });

        expect(res.body.password).toBeUndefined();
    });

    it('rejects an email that is already registered', async () => {
        await registerUser({ email: 'taken@example.com' });

        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Impostor', email: 'taken@example.com', password: 'password123' });

        expect(res.status).toBe(400);
    });

    it('allows signing up as a seller', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'A Seller', email: 'seller@example.com', password: 'password123', role: 'seller' });

        expect(res.body.role).toBe('seller');
    });

    it('refuses to grant admin from the signup payload', async () => {
        // Otherwise anyone could POST role: 'admin' and own the whole panel.
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Sneaky', email: 'sneaky@example.com', password: 'password123', role: 'admin' });

        expect(res.status).toBe(201);
        expect(res.body.role).toBe('buyer');
    });
});

describe('login', () => {
    it('accepts the right password and sets a refresh cookie', async () => {
        const { email, password } = await registerUser({ email: 'login@example.com' });

        const res = await login(email, password);

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeTruthy();
        expect(String(res.headers['set-cookie'])).toContain('refreshToken=');
    });

    it('rejects a wrong password', async () => {
        const { email } = await registerUser({ email: 'login@example.com' });

        const res = await login(email, 'not-the-password');

        expect(res.status).toBe(401);
    });

    it('gives the same answer for an unknown email as for a wrong password', async () => {
        // Not leaking which accounts exist.
        const res = await login('nobody@example.com', 'password123');

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Invalid email or password');
    });
});

describe('protected routes', () => {
    it('rejects a request with no token', async () => {
        const res = await request(app).get('/api/auth/profile');
        expect(res.status).toBe(401);
    });

    it('rejects a garbage token', async () => {
        const res = await request(app).get('/api/auth/profile').set(authHeader('not-a-jwt'));
        expect(res.status).toBe(401);
    });

    it('accepts a valid token', async () => {
        const { token, email } = await registerUser({ email: 'me@example.com' });

        const res = await request(app).get('/api/auth/profile').set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body.email).toBe(email);
    });
});

describe('changing a password', () => {
    it('requires the current password to be correct', async () => {
        const { token } = await registerUser({ email: 'pw@example.com' });

        const res = await request(app)
            .put('/api/auth/password')
            .set(authHeader(token))
            .send({ currentPassword: 'wrong-password', newPassword: 'newpassword123' });

        expect(res.status).toBe(401);
    });

    it('rejects a new password that is too short', async () => {
        const { token, password } = await registerUser({ email: 'pw@example.com' });

        const res = await request(app)
            .put('/api/auth/password')
            .set(authHeader(token))
            .send({ currentPassword: password, newPassword: 'abc' });

        expect(res.status).toBe(400);
    });

    it('rejects reusing the current password', async () => {
        const { token, password } = await registerUser({ email: 'pw@example.com' });

        const res = await request(app)
            .put('/api/auth/password')
            .set(authHeader(token))
            .send({ currentPassword: password, newPassword: password });

        expect(res.status).toBe(400);
    });

    it('actually changes which password works', async () => {
        const { token, email, password } = await registerUser({ email: 'pw@example.com' });

        await request(app)
            .put('/api/auth/password')
            .set(authHeader(token))
            .send({ currentPassword: password, newPassword: 'brandnewpass' });

        expect((await login(email, password)).status).toBe(401);
        expect((await login(email, 'brandnewpass')).status).toBe(200);
    });
});

describe('session revocation', () => {
    /** Logs the same account in twice, as if from two different devices. */
    const twoSessions = async (email) => {
        const { password } = await registerUser({ email });
        const first = await login(email, password);
        const second = await login(email, password);
        return { passwordUsed: password, deviceA: first.body.accessToken, deviceB: second.body.accessToken };
    };

    it('lets both devices in to begin with', async () => {
        const { deviceA, deviceB } = await twoSessions('two@example.com');

        expect((await request(app).get('/api/auth/profile').set(authHeader(deviceA))).status).toBe(200);
        expect((await request(app).get('/api/auth/profile').set(authHeader(deviceB))).status).toBe(200);
    });

    it('changing the password locks out the other device', async () => {
        const { deviceA, deviceB, passwordUsed } = await twoSessions('two@example.com');

        await request(app)
            .put('/api/auth/password')
            .set(authHeader(deviceA))
            .send({ currentPassword: passwordUsed, newPassword: 'rotatedpassword' });

        // Still a cryptographically valid JWT — but its tokenVersion is stale.
        const res = await request(app).get('/api/auth/profile').set(authHeader(deviceB));
        expect(res.status).toBe(401);
    });

    it('hands the acting device a fresh token so it stays signed in', async () => {
        const { deviceA, passwordUsed } = await twoSessions('two@example.com');

        const change = await request(app)
            .put('/api/auth/password')
            .set(authHeader(deviceA))
            .send({ currentPassword: passwordUsed, newPassword: 'rotatedpassword' });

        expect(change.body.accessToken).toBeTruthy();
        // The old token is stale even for the actor...
        expect((await request(app).get('/api/auth/profile').set(authHeader(deviceA))).status).toBe(401);
        // ...but the replacement works, which is what keeps them logged in.
        const res = await request(app).get('/api/auth/profile').set(authHeader(change.body.accessToken));
        expect(res.status).toBe(200);
    });

    it('logout-others revokes the other device without touching the password', async () => {
        const { deviceA, deviceB, passwordUsed } = await twoSessions('two@example.com');

        const res = await request(app).post('/api/auth/logout-others').set(authHeader(deviceA));

        expect(res.status).toBe(200);
        expect((await request(app).get('/api/auth/profile').set(authHeader(deviceB))).status).toBe(401);
        expect((await request(app).get('/api/auth/profile').set(authHeader(res.body.accessToken))).status).toBe(200);
        // The password itself is untouched.
        expect((await login('two@example.com', passwordUsed)).status).toBe(200);
    });

    it('refuses a refresh token issued before the revocation', async () => {
        const { password } = await registerUser({ email: 'refresh@example.com' });
        const first = await login('refresh@example.com', password);
        const staleCookie = String(first.headers['set-cookie']).split(';')[0];

        const second = await login('refresh@example.com', password);
        await request(app)
            .put('/api/auth/password')
            .set(authHeader(second.body.accessToken))
            .send({ currentPassword: password, newPassword: 'rotatedpassword' });

        const res = await request(app).post('/api/auth/refresh').set('Cookie', staleCookie);

        expect(res.status).toBe(401);
    });
});
