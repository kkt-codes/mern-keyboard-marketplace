import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Product from './Product';
import { renderWithProviders, buildProduct } from '../test/renderWithProviders';

// Guests never hit the API, but toasts are noise in test output.
vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() }
}));

describe('Product card', () => {
    it('shows the name, price and category', () => {
        renderWithProviders(<Product product={buildProduct()} />);

        expect(screen.getByText('Test Keyboard')).toBeInTheDocument();
        expect(screen.getByText('$129.99')).toBeInTheDocument();
        expect(screen.getByText('Mechanical')).toBeInTheDocument();
    });

    it('links through to the product detail page', () => {
        renderWithProviders(<Product product={buildProduct()} />);

        const [link] = screen.getAllByRole('link');
        expect(link).toHaveAttribute('href', '/product/product-1');
    });

    it('offers an Add to Cart button when in stock', () => {
        renderWithProviders(<Product product={buildProduct()} />);

        expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeEnabled();
    });

    it('disables the button and says so when out of stock', () => {
        renderWithProviders(<Product product={buildProduct({ countInStock: 0 })} />);

        expect(screen.getByRole('button', { name: 'Out of Stock' })).toBeDisabled();
    });

    it('adds a guest cart line without navigating away', async () => {
        // Adding from a grid should keep you on the grid.
        renderWithProviders(<Product product={buildProduct()} />);

        await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

        const stored = JSON.parse(localStorage.getItem('guestCart'));
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatchObject({ _id: 'product-1', qty: 1 });
    });

    it('increments the quantity when the same product is added twice', async () => {
        renderWithProviders(<Product product={buildProduct()} />);
        const button = screen.getByRole('button', { name: 'Add to Cart' });

        await userEvent.click(button);
        await userEvent.click(button);

        const stored = JSON.parse(localStorage.getItem('guestCart'));
        expect(stored).toHaveLength(1);
        expect(stored[0].qty).toBe(2);
    });
});
