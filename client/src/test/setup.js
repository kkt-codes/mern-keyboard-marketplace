import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
    cleanup();
    // Several components persist to localStorage. Clearing between tests
    // keeps them order-independent — no test can pass only because an
    // earlier one happened to leave the right value behind.
    localStorage.clear();
    vi.clearAllMocks();
});
