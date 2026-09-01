import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DemoPaymentNotice from './DemoPaymentNotice';

vi.mock('../services/api', () => ({
    default: { get: vi.fn() },
    setAccessToken: vi.fn()
}));

import api from '../services/api';

describe('DemoPaymentNotice', () => {
    beforeEach(() => {
        api.get.mockReset();
    });

    it('shows the test card once the server confirms test mode', async () => {
        api.get.mockResolvedValue({ data: { stripeTestMode: true } });

        render(<DemoPaymentNotice />);

        expect(await screen.findByText('4242 4242 4242 4242')).toBeInTheDocument();
        expect(screen.getByText(/no real payment is taken/i)).toBeInTheDocument();
    });

    it('reads the flag from the public config endpoint', async () => {
        api.get.mockResolvedValue({ data: { stripeTestMode: true } });

        render(<DemoPaymentNotice />);

        await waitFor(() => expect(api.get).toHaveBeenCalledWith('/config'));
    });

    it('renders nothing with live keys, so test cards are never advertised', async () => {
        api.get.mockResolvedValue({ data: { stripeTestMode: false } });

        const { container } = render(<DemoPaymentNotice />);

        await waitFor(() => expect(api.get).toHaveBeenCalled());
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByText(/4242/)).not.toBeInTheDocument();
    });

    it('stays hidden while the flag is still unknown', () => {
        // Never resolves — the notice must not flash before the answer lands,
        // since guessing wrong here would show test cards on a live checkout.
        api.get.mockReturnValue(new Promise(() => {}));

        const { container } = render(<DemoPaymentNotice />);

        expect(container).toBeEmptyDOMElement();
    });

    it('stays hidden when the config request fails', async () => {
        api.get.mockRejectedValue(new Error('network down'));

        const { container } = render(<DemoPaymentNotice />);

        await waitFor(() => expect(api.get).toHaveBeenCalled());
        expect(container).toBeEmptyDOMElement();
    });
});
