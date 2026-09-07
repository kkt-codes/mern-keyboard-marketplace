import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MyProductsPage from './MyProductsPage';
import { AuthProvider } from '../../context/AuthContext';
import { BookmarkProvider } from '../../context/BookmarkContext';
import { CartProvider } from '../../context/CartContext';
import { seedLoggedInUser } from '../../test/renderWithProviders';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const CATALOG = [
    { _id: 'p1', name: 'Ducky One 3 SF', price: 129, countInStock: 12, image: 'a.jpg' },
    { _id: 'p2', name: 'Compact 60% Board', price: 89, countInStock: 3, image: 'b.jpg' }
];

const apiGet = vi.fn();

vi.mock('../../services/api', () => ({
    default: {
        get: (...args) => apiGet(...args),
        post: vi.fn(() => Promise.resolve({ data: [] })),
        put: vi.fn(() => Promise.resolve({ data: [] })),
        delete: vi.fn(() => Promise.resolve({ data: {} }))
    },
    setAccessToken: vi.fn()
}));

/** Every request the page made for its own product list. */
const productRequests = () =>
    apiGet.mock.calls.filter(([url]) => url === '/products/myproducts');

const searchBox = () => screen.getByPlaceholderText('Search by product name...');

const renderPage = () => {
    seedLoggedInUser({ role: 'seller' });
    return render(
        <MemoryRouter initialEntries={['/dashboard/products']}>
            <AuthProvider>
                <BookmarkProvider>
                    <CartProvider>
                        <MyProductsPage />
                    </CartProvider>
                </BookmarkProvider>
            </AuthProvider>
        </MemoryRouter>
    );
};

/**
 * Resolves on a later task rather than a microtask.
 *
 * This matters: an instantly-resolved mock lets React batch a
 * `setLoading(true)` and the `setLoading(false)` that follows it into a single
 * render, so an intermediate loading branch never paints and a test can't see
 * it. A real request always spans at least one task, so the branch does render
 * in a browser. Without this delay these tests pass even against the bug.
 */
const respondAfterATick = (data) =>
    new Promise((resolve) => setTimeout(() => resolve({ data }), 10));

beforeEach(() => {
    localStorage.clear();
    apiGet.mockReset();
    apiGet.mockImplementation((url, config) => {
        if (url !== '/products/myproducts') return respondAfterATick([]);

        const keyword = (config?.params?.keyword || '').toLowerCase();
        const products = keyword
            ? CATALOG.filter((p) => p.name.toLowerCase().includes(keyword))
            : CATALOG;
        return respondAfterATick({ products, pages: 1 });
    });
});

describe('MyProductsPage search', () => {
    it('filters as you type, without needing Enter', async () => {
        const user = userEvent.setup();
        renderPage();

        await screen.findByText('Ducky One 3 SF');
        expect(screen.getByText('Compact 60% Board')).toBeInTheDocument();

        // No form submit, no Enter key — just characters.
        await user.type(searchBox(), 'Ducky');

        await waitFor(() => {
            expect(screen.queryByText('Compact 60% Board')).not.toBeInTheDocument();
        });
        expect(screen.getByText('Ducky One 3 SF')).toBeInTheDocument();
    });

    it('keeps the same input element mounted while results refresh', async () => {
        // The bug this guards: the page used to flip back to its full-page
        // "Loading..." branch on every refetch, which unmounted the search box
        // mid-search. The focused input was destroyed and rebuilt, so focus
        // fell to <body> and the user had to click the field again per letter.
        const user = userEvent.setup();
        renderPage();

        await screen.findByText('Ducky One 3 SF');

        const inputBefore = searchBox();
        inputBefore.focus();
        await user.type(inputBefore, 'Ducky');

        // Wait for the debounced refetch to land and re-render the table.
        await waitFor(() => {
            expect(screen.queryByText('Compact 60% Board')).not.toBeInTheDocument();
        });

        expect(document.body.contains(inputBefore)).toBe(true);
        expect(searchBox()).toBe(inputBefore);
        expect(document.activeElement).toBe(inputBefore);
        expect(inputBefore).toHaveValue('Ducky');
    });

    it('debounces, so a burst of keystrokes costs one request', async () => {
        const user = userEvent.setup();
        renderPage();

        await screen.findByText('Ducky One 3 SF');
        const initialCount = productRequests().length;

        await user.type(searchBox(), 'Ducky');

        await waitFor(() => {
            expect(screen.queryByText('Compact 60% Board')).not.toBeInTheDocument();
        });

        const searchRequests = productRequests().slice(initialCount);
        expect(searchRequests).toHaveLength(1);
        expect(searchRequests[0][1].params.keyword).toBe('Ducky');
    });

    it('restores the full list when the box is cleared, without Enter', async () => {
        const user = userEvent.setup();
        renderPage();

        await screen.findByText('Ducky One 3 SF');
        await user.type(searchBox(), 'Ducky');
        await waitFor(() => {
            expect(screen.queryByText('Compact 60% Board')).not.toBeInTheDocument();
        });

        await user.clear(searchBox());

        await waitFor(() => {
            expect(screen.getByText('Compact 60% Board')).toBeInTheDocument();
        });
    });
});
