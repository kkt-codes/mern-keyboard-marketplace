import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Pagination from './Pagination';

describe('Pagination', () => {
    it('renders nothing when there is only one page', () => {
        // Callers include it unconditionally, so it has to stay out of the
        // way rather than showing a lone "1" button.
        const { container } = render(<Pagination page={1} pages={1} onPageChange={() => {}} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when there are no pages at all', () => {
        const { container } = render(<Pagination page={1} pages={0} onPageChange={() => {}} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('renders one button per page', () => {
        render(<Pagination page={1} pages={4} onPageChange={() => {}} />);

        expect(screen.getAllByRole('button')).toHaveLength(4);
        expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
    });

    it('marks the current page for assistive tech', () => {
        render(<Pagination page={3} pages={5} onPageChange={() => {}} />);

        expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('button', { name: '2' })).not.toHaveAttribute('aria-current');
    });

    it('reports the page that was clicked', async () => {
        const onPageChange = vi.fn();
        render(<Pagination page={1} pages={3} onPageChange={onPageChange} />);

        await userEvent.click(screen.getByRole('button', { name: '3' }));

        expect(onPageChange).toHaveBeenCalledWith(3);
    });
});
