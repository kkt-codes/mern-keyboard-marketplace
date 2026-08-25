import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Rating from './Rating';

describe('Rating', () => {
    it('fills a star for each whole point', () => {
        render(<Rating value={3} />);

        expect(screen.getByLabelText('3.0 out of 5 stars')).toHaveTextContent('★★★☆☆');
    });

    it('rounds a fractional average to the nearest star', () => {
        render(<Rating value={3.7} />);

        expect(screen.getByLabelText('3.7 out of 5 stars')).toHaveTextContent('★★★★☆');
    });

    it('shows all five empty for an unrated product', () => {
        render(<Rating />);

        expect(screen.getByLabelText('0.0 out of 5 stars')).toHaveTextContent('☆☆☆☆☆');
    });

    it('shows the review count when given one', () => {
        render(<Rating value={5} text="(12 reviews)" />);

        expect(screen.getByText('(12 reviews)')).toBeInTheDocument();
    });
});
