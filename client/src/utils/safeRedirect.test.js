import { describe, it, expect } from 'vitest';
import { safeRedirect } from './safeRedirect';

describe('safeRedirect', () => {
    it('allows an ordinary in-app path', () => {
        expect(safeRedirect('/shipping')).toBe('/shipping');
    });

    it('allows a path with segments and a query string', () => {
        expect(safeRedirect('/order/abc123?payment=success')).toBe('/order/abc123?payment=success');
    });

    it.each([
        ['//example.com/pwned', 'protocol-relative'],
        ['/\\example.com/pwned', 'backslash variant'],
        ['https://example.com/pwned', 'absolute URL'],
        ['http://example.com', 'plain http URL'],
        ['javascript:alert(1)', 'javascript scheme'],
        ['example.com', 'bare host']
    ])('sends %s home (%s)', (payload) => {
        expect(safeRedirect(payload)).toBe('/');
    });

    it.each([
        [null, 'missing param'],
        [undefined, 'undefined'],
        ['', 'empty string'],
        [42, 'non-string']
    ])('falls back to home for %s (%s)', (payload) => {
        expect(safeRedirect(payload)).toBe('/');
    });
});
