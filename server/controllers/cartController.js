const User = require('../models/User');
const Product = require('../models/Product');

/**
 * Turns stored `{ product, qty }` refs into the full product objects the
 * client renders, reading live Product data rather than any snapshot.
 *
 * Two kinds of drift are reconciled here rather than at checkout, so the
 * cart the user sees is always one they can actually buy:
 *   - the product was deleted or is out of stock  -> the line is dropped
 *   - stock fell below the saved quantity         -> the quantity is capped
 *
 * @param {Array<{product: object, qty: number}>} storedItems
 * @returns {{items: object[], changed: boolean}} `changed` is true when the
 *          stored cart no longer matches reality and should be written back.
 */
const hydrateCart = async (storedItems = []) => {
    if (storedItems.length === 0) {
        return { items: [], changed: false };
    }

    const products = await Product.find({
        _id: { $in: storedItems.map((item) => item.product) }
    });
    const productById = new Map(products.map((p) => [p._id.toString(), p]));

    const items = [];
    let changed = false;

    for (const stored of storedItems) {
        const product = productById.get(stored.product.toString());

        if (!product || product.countInStock < 1) {
            changed = true;
            continue;
        }

        const qty = Math.min(stored.qty, product.countInStock);
        if (qty !== stored.qty) {
            changed = true;
        }

        // Spread the product so the client keeps the shape it already
        // renders (_id, name, image, price, countInStock) plus qty.
        items.push({ ...product.toObject(), qty });
    }

    return { items, changed };
};

/** Strips a hydrated cart back down to what actually gets persisted. */
const toStored = (items) => items.map((item) => ({ product: item._id, qty: item.qty }));

/**
 * Normalises whatever the client sent into `{ product, qty }` pairs,
 * collapsing any duplicate lines for the same product.
 */
const normaliseIncoming = (items) => {
    const byProduct = new Map();

    for (const item of Array.isArray(items) ? items : []) {
        const productId = item?.product;
        const qty = Number(item?.qty);

        if (!productId || !Number.isInteger(qty) || qty < 1) continue;

        const key = String(productId);
        byProduct.set(key, (byProduct.get(key) || 0) + qty);
    }

    return [...byProduct].map(([product, qty]) => ({ product, qty }));
};

/**
 * @desc    Get the logged-in user's saved cart
 * @route   GET /api/cart
 * @access  Private
 */
const getCart = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const { items, changed } = await hydrateCart(user.cart);

        // Persist the reconciliation so the stored cart doesn't keep drifting.
        if (changed) {
            user.cart = toStored(items);
            await user.save();
        }

        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Replace the logged-in user's cart
 * @route   PUT /api/cart
 * @access  Private
 * @note    A whole-cart replace keeps the client simple: add, remove and
 *          quantity changes are all just "here is the new cart", and
 *          repeating a request is harmless.
 */
const replaceCart = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.cart = normaliseIncoming(req.body?.items);

        const { items } = await hydrateCart(user.cart);
        user.cart = toStored(items);
        await user.save();

        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Merge a guest cart into the logged-in user's saved cart
 * @route   POST /api/cart/merge
 * @access  Private
 * @note    Called right after login. Quantities for a product present in
 *          both carts are added together (then capped at available stock),
 *          so items picked up before signing in are added to what was
 *          already saved rather than replacing it. Sending an empty list is
 *          a no-op, which makes this safe to call on every login.
 */
const mergeCart = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const incoming = normaliseIncoming(req.body?.items);

        const merged = new Map(user.cart.map((item) => [item.product.toString(), item.qty]));
        for (const item of incoming) {
            const key = String(item.product);
            merged.set(key, (merged.get(key) || 0) + item.qty);
        }

        user.cart = [...merged].map(([product, qty]) => ({ product, qty }));

        // hydrateCart caps each line at available stock, so a merge can never
        // produce a quantity the buyer couldn't actually check out with.
        const { items } = await hydrateCart(user.cart);
        user.cart = toStored(items);
        await user.save();

        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getCart, replaceCart, mergeCart };
