/**
 * Standard error responder for controller catch blocks.
 *
 * Mongoose throws a CastError when an :id route param isn't a syntactically
 * valid ObjectId (e.g. GET /api/orders/not-an-id). Every controller here
 * just does `.findById(req.params.id)`, so a malformed id was falling
 * through to a generic 500 — even though "the id you gave me isn't even
 * shaped right" is really the same case as "not found" from the caller's
 * point of view, and should read the same way over the API.
 *
 * @param {import('express').Response} res
 * @param {Error} error
 */
const sendError = (res, error) => {
    if (error.name === 'CastError') {
        return res.status(404).json({ message: 'Resource not found' });
    }
    res.status(500).json({ message: error.message });
};

module.exports = sendError;
