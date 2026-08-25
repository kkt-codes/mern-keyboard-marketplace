import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { BookmarkProvider } from '../context/BookmarkContext';
import { CartProvider } from '../context/CartContext';

/**
 * Renders a component inside the same provider stack as main.jsx, so tests
 * exercise the real context wiring rather than hand-rolled stand-ins.
 * Order matters: CartProvider reads AuthContext to tell guests from users.
 */
export const renderWithProviders = (ui, { route = '/' } = {}) =>
    render(
        <MemoryRouter initialEntries={[route]}>
            <AuthProvider>
                <BookmarkProvider>
                    <CartProvider>{ui}</CartProvider>
                </BookmarkProvider>
            </AuthProvider>
        </MemoryRouter>
    );

/** Seeds a signed-in user the way AuthContext expects to find one. */
export const seedLoggedInUser = (overrides = {}) => {
    const user = {
        _id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'buyer',
        accessToken: 'test-token',
        ...overrides
    };
    localStorage.setItem('userInfo', JSON.stringify(user));
    return user;
};

export const buildProduct = (overrides = {}) => ({
    _id: 'product-1',
    name: 'Test Keyboard',
    image: 'https://example.com/board.jpg',
    price: 129.99,
    countInStock: 5,
    rating: 4,
    numReviews: 3,
    category: 'Mechanical',
    ...overrides
});
