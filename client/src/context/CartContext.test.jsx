import { useContext } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartContext } from './CartContext';
import { AuthContext } from './AuthContext';
import { renderWithProviders, seedLoggedInUser, buildProduct } from '../test/renderWithProviders';

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() }
}));

// The cart talks to the API only when someone is signed in.
vi.mock('../services/api', () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: [] })),
        post: vi.fn(() => Promise.resolve({ data: [] })),
        put: vi.fn(() => Promise.resolve({ data: [] })),
        delete: vi.fn(() => Promise.resolve({ data: {} }))
    },
    setAccessToken: vi.fn()
}));

import api from '../services/api';

/** Minimal harness exposing the cart and logout to the test. */
const CartProbe = ({ product = buildProduct() }) => {
    const { cartItems, addToCart, removeFromCart, clearCart } = useContext(CartContext);
    const { logout } = useContext(AuthContext);

    return (
        <div>
            <span data-testid="count">{cartItems.reduce((n, i) => n + i.qty, 0)}</span>
            <span data-testid="lines">{cartItems.length}</span>
            <button onClick={() => addToCart(product, 1)}>add</button>
            <button onClick={() => addToCart(product, 4)}>set-four</button>
            <button onClick={() => removeFromCart(product._id)}>remove</button>
            <button onClick={clearCart}>clear</button>
            <button onClick={logout}>logout</button>
        </div>
    );
};

describe('the guest cart', () => {
    it('starts empty', () => {
        renderWithProviders(<CartProbe />);

        expect(screen.getByTestId('count')).toHaveTextContent('0');
    });

    it('keeps items in localStorage so they survive a refresh', async () => {
        renderWithProviders(<CartProbe />);

        await userEvent.click(screen.getByRole('button', { name: 'add' }));

        await waitFor(() => {
            expect(JSON.parse(localStorage.getItem('guestCart'))).toHaveLength(1);
        });
    });

    it('reads an existing guest cart back on load', async () => {
        localStorage.setItem('guestCart', JSON.stringify([{ ...buildProduct(), qty: 3 }]));

        renderWithProviders(<CartProbe />);

        await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('3'));
    });

    it('treats the quantity as the new total, not an increment', async () => {
        // A stepper set to 4 means 4, not "add 4 more".
        renderWithProviders(<CartProbe />);

        await userEvent.click(screen.getByRole('button', { name: 'add' }));
        await userEvent.click(screen.getByRole('button', { name: 'set-four' }));

        await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('4'));
        expect(screen.getByTestId('lines')).toHaveTextContent('1');
    });

    it('removes a line', async () => {
        renderWithProviders(<CartProbe />);
        await userEvent.click(screen.getByRole('button', { name: 'add' }));

        await userEvent.click(screen.getByRole('button', { name: 'remove' }));

        await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    });

    it('never calls the API while signed out', async () => {
        renderWithProviders(<CartProbe />);

        await userEvent.click(screen.getByRole('button', { name: 'add' }));

        expect(api.put).not.toHaveBeenCalled();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('discards a cart left behind by the old shared storage key', async () => {
        // Older builds kept every account's cart under one `cartItems` key
        // that was never cleared on logout, so it leaked between accounts.
        // It must be dropped, not adopted — we cannot tell whose it was.
        localStorage.setItem('cartItems', JSON.stringify([{ ...buildProduct(), qty: 9 }]));

        renderWithProviders(<CartProbe />);

        await waitFor(() => expect(localStorage.getItem('cartItems')).toBeNull());
        expect(screen.getByTestId('count')).toHaveTextContent('0');
    });
});

describe('signing in', () => {
    beforeEach(() => {
        api.post.mockResolvedValue({ data: [{ ...buildProduct(), qty: 5 }] });
    });

    it('merges the guest cart up to the server', async () => {
        localStorage.setItem('guestCart', JSON.stringify([{ ...buildProduct(), qty: 2 }]));
        seedLoggedInUser();

        renderWithProviders(<CartProbe />);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/cart/merge', {
                items: [{ product: 'product-1', qty: 2 }]
            });
        });
    });

    it('adopts the merged cart the server returns', async () => {
        localStorage.setItem('guestCart', JSON.stringify([{ ...buildProduct(), qty: 2 }]));
        seedLoggedInUser();

        renderWithProviders(<CartProbe />);

        await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('5'));
    });

    it('clears the guest copy once it has been merged', async () => {
        localStorage.setItem('guestCart', JSON.stringify([{ ...buildProduct(), qty: 2 }]));
        seedLoggedInUser();

        renderWithProviders(<CartProbe />);

        await waitFor(() => expect(localStorage.getItem('guestCart')).toBeNull());
    });

    it('still syncs when there was no guest cart', async () => {
        seedLoggedInUser();

        renderWithProviders(<CartProbe />);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/cart/merge', { items: [] });
        });
    });
});

describe('signing out', () => {
    it('empties the cart so the next person sees nothing', async () => {
        api.post.mockResolvedValue({ data: [{ ...buildProduct(), qty: 5 }] });
        seedLoggedInUser();
        renderWithProviders(<CartProbe />);
        await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('5'));

        await userEvent.click(screen.getByRole('button', { name: 'logout' }));

        await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    });

    it('leaves no cart or shipping details behind in storage', async () => {
        // The shipping address is the previous user's personal data.
        api.post.mockResolvedValue({ data: [{ ...buildProduct(), qty: 5 }] });
        localStorage.setItem('shippingAddress', JSON.stringify({ address: '42 Private Lane' }));
        seedLoggedInUser();
        renderWithProviders(<CartProbe />);
        await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('5'));

        await userEvent.click(screen.getByRole('button', { name: 'logout' }));

        await waitFor(() => {
            expect(JSON.parse(localStorage.getItem('shippingAddress') || '{}')).toEqual({});
        });
        expect(localStorage.getItem('guestCart')).toBeNull();
    });
});
