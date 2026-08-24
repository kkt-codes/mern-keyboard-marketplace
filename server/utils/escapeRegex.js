/**
 * Escapes regex metacharacters in user-supplied search input.
 * Without this, a keyword like `.*` or `(a+)+` passed straight into
 * `$regex` could match everything or cause catastrophic backtracking (ReDoS).
 * @param {string} text
 * @returns {string}
 */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = escapeRegex;
