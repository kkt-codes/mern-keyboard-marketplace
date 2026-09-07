import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation, useSearchParams } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from './Header';
import { AuthProvider } from '../context/AuthContext';
import { BookmarkProvider } from '../context/BookmarkContext';
import { CartProvider } from '../context/CartContext';

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

/** Surfaces the live URL so assertions can read it. */
const UrlProbe = () => {
    const location = useLocation();
    return <div data-testid="url">{location.pathname + location.search}</div>;
};

/** Mimics the products page's own Clear Filters button. */
const ClearFilters = () => {
    const [, setSearchParams] = useSearchParams();
    return (
        <button type="button" onClick={() => setSearchParams({})}>
            Clear filters
        </button>
    );
};

const url = () => screen.getByTestId('url').textContent;

/**
 * jsdom has no layout, so `hidden md:block` doesn't actually hide the desktop
 * copy — both render. They share one piece of state, so driving the first is
 * equivalent; this just makes the choice explicit rather than accidental.
 */
const searchBox = () => screen.getAllByPlaceholderText('Search keyboards...')[0];

const renderAt = (route) =>
    render(
        <MemoryRouter initialEntries={[route]}>
            <AuthProvider>
                <BookmarkProvider>
                    <CartProvider>
                        <Header />
                        <ClearFilters />
                        <Routes>
                            <Route path="*" element={<UrlProbe />} />
                        </Routes>
                    </CartProvider>
                </BookmarkProvider>
            </AuthProvider>
        </MemoryRouter>
    );

beforeEach(() => localStorage.clear());

describe('header search on the products page', () => {
    it('filters live as you type, with no Enter', async () => {
        const user = userEvent.setup();
        renderAt('/products');

        await user.type(searchBox(), 'GMMK');

        await waitFor(() => expect(url()).toBe('/products?keyword=GMMK'));
    });

    it('clears the keyword when the box is emptied, with no Enter', async () => {
        const user = userEvent.setup();
        renderAt('/products?keyword=GMMK');

        expect(searchBox()).toHaveValue('GMMK');
        await user.clear(searchBox());

        await waitFor(() => expect(url()).toBe('/products'));
    });

    it('keeps the box mounted and focused while the URL updates', async () => {
        const user = userEvent.setup();
        renderAt('/products');

        const box = searchBox();
        box.focus();
        await user.type(box, 'GMMK');
        await waitFor(() => expect(url()).toBe('/products?keyword=GMMK'));

        expect(document.body.contains(box)).toBe(true);
        expect(searchBox()).toBe(box);
        expect(document.activeElement).toBe(box);
    });

    it('preserves the other filters when the keyword changes', async () => {
        const user = userEvent.setup();
        renderAt('/products?category=Mechanical&sort=price_asc');

        await user.type(searchBox(), 'GMMK');

        await waitFor(() => {
            const params = new URLSearchParams(url().split('?')[1]);
            expect(params.get('keyword')).toBe('GMMK');
            expect(params.get('category')).toBe('Mechanical');
            expect(params.get('sort')).toBe('price_asc');
        });
    });

    it('drops back to page 1 when the search changes', async () => {
        const user = userEvent.setup();
        renderAt('/products?page=3');

        await user.type(searchBox(), 'GMMK');

        await waitFor(() => expect(url()).toBe('/products?keyword=GMMK'));
    });

    it('follows the URL when the keyword is cleared from elsewhere', async () => {
        // Stands in for the page's own Clear Filters button and the Back
        // button: the URL loses its keyword and the box has to notice rather
        // than sit there stale, still showing a search that is no longer on.
        const user = userEvent.setup();
        renderAt('/products?keyword=GMMK');
        expect(searchBox()).toHaveValue('GMMK');

        await user.click(screen.getByRole('button', { name: 'Clear filters' }));

        await waitFor(() => expect(searchBox()).toHaveValue(''));
        expect(url()).toBe('/products');
    });
});

describe('header search away from the products page', () => {
    it('does not navigate while you type', async () => {
        const user = userEvent.setup();
        renderAt('/');

        await user.type(searchBox(), 'GMMK');
        // Well past the debounce window — typing must not move you.
        await new Promise((resolve) => setTimeout(resolve, 600));

        expect(url()).toBe('/');
    });

    it('navigates to the products page on submit', async () => {
        const user = userEvent.setup();
        renderAt('/');

        await user.type(searchBox(), 'GMMK{Enter}');

        await waitFor(() => expect(url()).toBe('/products?keyword=GMMK'));
    });
});
