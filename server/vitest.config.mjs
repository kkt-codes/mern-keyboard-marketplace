import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        // Seeds the Stripe fake into require.cache and boots an in-memory
        // MongoDB before any test file loads the app.
        setupFiles: ['./tests/setup.js'],
        // Every file spins up its own throwaway MongoDB. Running them one at
        // a time keeps that predictable and avoids several servers competing
        // for resources on a small machine.
        fileParallelism: false,
        // The first run downloads a MongoDB binary, which can take a while.
        hookTimeout: 120000,
        testTimeout: 20000
    }
});
