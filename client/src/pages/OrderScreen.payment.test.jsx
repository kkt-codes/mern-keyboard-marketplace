import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OrderScreen from './OrderScreen';
import { AuthProvider } from '../context/AuthContext';
import { BookmarkProvider } from '../context/BookmarkContext';
import { CartProvider } from '../context/CartContext';
import { seedLoggedInUser } from '../test/renderWithProviders';

vi.mock('react-hot-toast', () => {
    const toast = Object.assign(
        vi.fn(),
        {
            success: vi.fn(),
            error: vi.fn(),
            loading: vi.fn(() => 'toast-1'),
            dismiss: vi.fn()
        }
    );
    return { default: toast };
});

vi.mock('../services/api', () => ({
    default: { get: vi.fn(), post: vi.fn(() => Promise.resolve({ data: [] })), put: vi.fn(), delete: vi.fn() },
    setAccessToken: vi.fn()
}));

import toast from 'react-hot-toast';
import api from '../services/api';

const buildOrder = (overrides = {}) => ({
    _id: 'order-1',
    user: { _id: 'user-1', name: 'Test User', email: 'test@example.com' },
    orderItems: [
        { product: 'p1', name: 'Board', qty: 1, image: 'x.jpg', price: 10, isDelivered: false }
    ],
    shippingAddress: { address: '1 St', city: 'Town', postalCode: '000', country: 'Land' },
    paymentMethod: 'Stripe',
    itemsPrice: 10,
    taxPrice: 1.5,
    shippingPrice: 0,
    totalPrice: 11.5,
    isPaid: false,
    isDelivered: false,
    isCancelled: false,
    createdAt: new Date().toISOString(),
    ...overrides
});

const renderAt = (url) => {
    seedLoggedInUser();
    return render(
        <MemoryRouter initialEntries={[url]}>
            <AuthProvider>
                <BookmarkProvider>
                    <CartProvider>
                        <Routes>
                            <Route path="/order/:id" element={<OrderScreen />} />
                        </Routes>
                    </CartProvider>
                </BookmarkProvider>
            </AuthProvider>
        </MemoryRouter>
    );
};

describe('returning from Stripe', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('confirms only once the order itself reports paid', async () => {
        api.get.mockResolvedValue({ data: buildOrder({ isPaid: true, paidAt: new Date().toISOString() }) });

        renderAt('/order/order-1?payment=success');

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Payment confirmed', expect.anything()));
    });

    it('does not claim success while the order is still unpaid', async () => {
        // The webhook is what marks an order paid; the redirect proves nothing.
        // Announcing success here would sit above a row reading "Unpaid".
        api.get.mockResolvedValue({ data: buildOrder({ isPaid: false }) });

        renderAt('/order/order-1?payment=success');

        await waitFor(() => expect(api.get).toHaveBeenCalled());
        await vi.advanceTimersByTimeAsync(3000);

        expect(toast.success).not.toHaveBeenCalled();
    });

    it('shows a pending state while waiting for the webhook', async () => {
        api.get.mockResolvedValue({ data: buildOrder({ isPaid: false }) });

        renderAt('/order/order-1?payment=success');

        await waitFor(() => expect(toast.loading).toHaveBeenCalledWith('Confirming your payment...'));
    });

    it('keeps polling and confirms when the webhook lands late', async () => {
        api.get
            .mockResolvedValueOnce({ data: buildOrder({ isPaid: false }) })
            .mockResolvedValueOnce({ data: buildOrder({ isPaid: false }) })
            .mockResolvedValue({ data: buildOrder({ isPaid: true, paidAt: new Date().toISOString() }) });

        renderAt('/order/order-1?payment=success');

        await waitFor(() => expect(api.get).toHaveBeenCalled());
        await vi.advanceTimersByTimeAsync(5000);

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Payment confirmed', expect.anything()));
    });

    it('reports honestly, not as success or failure, if it never confirms', async () => {
        api.get.mockResolvedValue({ data: buildOrder({ isPaid: false }) });

        renderAt('/order/order-1?payment=success');

        await waitFor(() => expect(api.get).toHaveBeenCalled());
        await vi.advanceTimersByTimeAsync(20000);

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(
                expect.stringContaining('could not confirm'),
                expect.anything()
            );
        });
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('reports a cancelled payment without polling', async () => {
        api.get.mockResolvedValue({ data: buildOrder({ isPaid: false }) });

        renderAt('/order/order-1?payment=canceled');

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Payment canceled'));
        expect(toast.loading).not.toHaveBeenCalled();
    });

    it('says nothing when the page is opened normally', async () => {
        api.get.mockResolvedValue({ data: buildOrder({ isPaid: false }) });

        renderAt('/order/order-1');

        await waitFor(() => expect(api.get).toHaveBeenCalled());

        expect(toast.loading).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
    });
});
