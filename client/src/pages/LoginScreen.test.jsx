import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import LoginScreen from './LoginScreen';
import { AuthProvider } from '../context/AuthContext';
import { BookmarkProvider } from '../context/BookmarkContext';
import { CartProvider } from '../context/CartContext';
import { seedLoggedInUser } from '../test/renderWithProviders';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

vi.mock('../services/api', () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: [] })),
        post: vi.fn(() => Promise.resolve({ data: [] })),
        put: vi.fn(() => Promise.resolve({ data: [] })),
        delete: vi.fn(() => Promise.resolve({ data: {} }))
    },
    setAccessToken: vi.fn()
}));

/** Reports wherever the app ended up, so the test can assert on it. */
const LocationProbe = () => {
    const location = useLocation();
    return <div data-testid="landed">{location.pathname + location.search}</div>;
};

/**
 * Renders the login route already signed in, which is what triggers the
 * post-authentication redirect.
 */
const renderLoginAt = (url) => {
    seedLoggedInUser();
    return render(
        <MemoryRouter initialEntries={[url]}>
            <AuthProvider>
                <BookmarkProvider>
                    <CartProvider>
                        <Routes>
                            <Route path="/login" element={<LoginScreen />} />
                            <Route path="*" element={<LocationProbe />} />
                        </Routes>
                    </CartProvider>
                </BookmarkProvider>
            </AuthProvider>
        </MemoryRouter>
    );
};

describe('LoginScreen redirect handling', () => {
    it('sends a signed-in user to the requested in-app path', async () => {
        renderLoginAt('/login?redirect=/shipping');

        await waitFor(() => expect(screen.getByTestId('landed')).toHaveTextContent('/shipping'));
    });

    it('keeps the rest of the query string intact', async () => {
        // The old `split('=')[1]` parsing mangled anything past the first `=`.
        renderLoginAt('/login?redirect=' + encodeURIComponent('/order/abc?payment=success'));

        await waitFor(() =>
            expect(screen.getByTestId('landed')).toHaveTextContent('/order/abc?payment=success')
        );
    });

    it('reads the right param when it is not the first one', async () => {
        // `split('=')[1]` returned "1&redirect" for this URL.
        renderLoginAt('/login?foo=1&redirect=/shipping');

        await waitFor(() => expect(screen.getByTestId('landed')).toHaveTextContent('/shipping'));
    });

    it.each([
        '//example.com/pwned',
        '/\\example.com/pwned',
        'https://example.com/pwned'
    ])('refuses to leave the origin for %s', async (payload) => {
        renderLoginAt('/login?redirect=' + encodeURIComponent(payload));

        await waitFor(() => expect(screen.getByTestId('landed')).toBeInTheDocument());
        expect(screen.getByTestId('landed')).toHaveTextContent('/');
        expect(screen.getByTestId('landed')).not.toHaveTextContent('example.com');
    });

    it('defaults to home when no redirect is given', async () => {
        renderLoginAt('/login');

        await waitFor(() => expect(screen.getByTestId('landed')).toHaveTextContent('/'));
    });
});
