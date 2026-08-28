const path = require('path');
const { request, app } = require('./helpers');

/**
 * Covers the wiring that only matters once the app is behind a proxy and
 * serving its own frontend. All of it fails silently in ways that look like
 * application bugs, so it's worth pinning down here rather than discovering
 * it in production.
 */
describe('deployment wiring', () => {
    describe('health check', () => {
        it('answers without auth', async () => {
            const res = await request(app).get('/api/health');

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });

        it('is not rate limited into failing a liveness probe', async () => {
            // Hosts poll this every few seconds; a 429 here reads as the app
            // being down and can trigger a restart loop.
            const results = await Promise.all(
                Array.from({ length: 30 }, () => request(app).get('/api/health'))
            );

            expect(results.every((r) => r.status === 200)).toBe(true);
        });
    });

    describe('unknown API paths', () => {
        it('returns a JSON 404 rather than falling through to the SPA', async () => {
            // If this ever returns HTML with a 200, every client-side error
            // handler starts lying about what went wrong.
            const res = await request(app).get('/api/no-such-endpoint');

            expect(res.status).toBe(404);
            expect(res.body.message).toContain('/api/no-such-endpoint');
        });

        it('404s unknown API paths for non-GET methods too', async () => {
            const res = await request(app).post('/api/nope').send({});

            expect(res.status).toBe(404);
            expect(res.body.message).toContain('POST');
        });

        it('still serves real API routes', async () => {
            const res = await request(app).get('/api/products');

            expect(res.status).toBe(200);
        });

        it('does not swallow /api-docs, which only shares a prefix', async () => {
            // `app.use('/api', ...)` matches /api and /api/... but must not
            // match the separate /api-docs mount.
            const res = await request(app).get('/api-docs/');

            expect(res.status).toBe(200);
            expect(res.text).toContain('swagger');
        });
    });

    describe('proxy trust', () => {
        it('does not trust forwarded IPs by default', async () => {
            // Trusting X-Forwarded-For with nothing in front of the app would
            // let anyone forge a fresh rate-limit bucket per request.
            expect(app.get('trust proxy')).toBe(0);
        });
    });

    describe('API docs', () => {
        it('documents every route regardless of the working directory', async () => {
            // swagger-jsdoc globs relative to process.cwd(), so a relative
            // `apis` path yields an empty spec under `node server/server.js`.
            const original = process.cwd();
            try {
                process.chdir(path.join(__dirname, '..', '..'));
                delete require.cache[require.resolve('../config/swagger')];
                const spec = require('../config/swagger');

                expect(Object.keys(spec.paths).length).toBeGreaterThan(20);
            } finally {
                process.chdir(original);
            }
        });
    });
});
