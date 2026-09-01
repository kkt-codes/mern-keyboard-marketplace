const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const stripe = require('../config/stripe');
const sendError = require('../utils/sendError');
const escapeRegex = require('../utils/escapeRegex');

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Takes stock off the shelf for an order's line items.
 *
 * Each decrement is a single conditional update — the `countInStock: { $gte }`
 * filter and the `$inc` are evaluated atomically by MongoDB, so when two
 * checkouts race for the last unit exactly one of them matches a document and
 * wins. That's the whole point: a read-then-write check can't give this
 * guarantee, because both readers see stock available before either writes.
 *
 * If a later item can't be satisfied, the ones already taken are handed back
 * so a partial failure never strands inventory.
 *
 * @param {Array<{product: object, qty: number, name: string}>} items
 * @returns {Promise<{ok: boolean, failedItem?: object}>}
 */
const reserveStock = async (items) => {
    const taken = [];

    for (const item of items) {
        const result = await Product.updateOne(
            { _id: item.product, countInStock: { $gte: item.qty } },
            { $inc: { countInStock: -item.qty } }
        );

        if (result.modifiedCount !== 1) {
            await releaseStock(taken);
            return { ok: false, failedItem: item };
        }

        taken.push(item);
    }

    return { ok: true };
};

/**
 * Voids an order's open Stripe Checkout session so it can no longer be paid.
 *
 * Best-effort by design: Stripe rejects this if the session was already
 * completed or has lapsed, and neither is a problem worth failing the caller
 * over. A session completed a moment before we got here is handled by the
 * webhook, which refunds anything that lands on an order we can't fulfil.
 *
 * @param {string} sessionId
 */
const expireCheckoutSession = async (sessionId) => {
    if (!sessionId) return;

    try {
        await stripe.checkout.sessions.expire(sessionId);
    } catch (error) {
        console.warn(`Could not expire checkout session ${sessionId}: ${error.message}`);
    }
};

/**
 * Records a completed Checkout Session against the order.
 *
 * Shared by the webhook and the pre-checkout guard so both write the same
 * fields — otherwise an order settled by one route would look subtly
 * different from one settled by the other.
 *
 * Stock was already taken when checkout started, so nothing is decremented
 * here; the reservation simply becomes permanent, and stays flagged so a
 * later refund still knows to put the items back.
 *
 * @param {object} order Mongoose order document.
 * @param {object} session Stripe Checkout Session.
 */
const applyPaidSession = async (order, session) => {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
        id: session.payment_intent,
        status: session.payment_status,
        update_time: new Date().toISOString(),
        email_address: session.customer_details?.email || ''
    };
    await order.save();
};

/**
 * Asks Stripe whether the order's existing session was already paid, and
 * settles the order if so.
 *
 * The `order.isPaid` flag is only ever set by the webhook, so it reports
 * "unpaid" for the whole window between the buyer paying and the event
 * arriving — and webhooks are not instant, nor guaranteed. Minting a fresh
 * session during that window charges the buyer a second time, and expiring
 * the old one cannot prevent it: Stripe refuses to expire a session that is
 * already `complete`.
 *
 * So before starting another payment, ask Stripe what actually happened
 * rather than trusting local state that is waiting on a message.
 *
 * @param {object} order Mongoose order document.
 * @returns {Promise<boolean>} True if the order turned out to be paid.
 */
const settleIfSessionAlreadyPaid = async (order) => {
    if (!order.checkoutSessionId) return false;

    try {
        const session = await stripe.checkout.sessions.retrieve(order.checkoutSessionId);

        if (session.payment_status !== 'paid') return false;

        await applyPaidSession(order, session);
        return true;
    } catch (error) {
        // A stale or unreadable session id shouldn't block checkout. If Stripe
        // is unreachable the session creation below will fail on its own.
        console.warn(
            `Could not check checkout session ${order.checkoutSessionId}: ${error.message}`
        );
        return false;
    }
};

/** Puts reserved stock back on the shelf. */
const releaseStock = async (items) => {
    if (items.length === 0) return;

    await Product.bulkWrite(
        items.map((item) => ({
            updateOne: {
                filter: { _id: item.product },
                update: { $inc: { countInStock: item.qty } }
            }
        }))
    );
};

/**
 * @desc    Create new order
 * @route   POST /api/orders
 * @access  Private
 * @note    The client only chooses *what* to buy (product ids + quantities).
 *          Names, images, prices, and all totals are rebuilt from the
 *          database here — any prices sent in the request body are ignored,
 *          so a crafted request can't buy products at made-up prices.
 */
const addOrderItems = async (req, res) => {
    try {
        const { orderItems, shippingAddress, paymentMethod } = req.body;

        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }

        const ids = orderItems.map((item) => item.product);
        if (new Set(ids.map(String)).size !== ids.length) {
            return res.status(400).json({ message: 'Duplicate products in order' });
        }

        const products = await Product.find({ _id: { $in: ids } });
        const productById = new Map(products.map((p) => [p._id.toString(), p]));

        const verifiedItems = [];
        for (const item of orderItems) {
            const product = productById.get(String(item.product));
            if (!product) {
                return res.status(400).json({ message: 'One of the products no longer exists' });
            }

            const qty = Number(item.qty);
            if (!Number.isInteger(qty) || qty < 1) {
                return res.status(400).json({ message: `Invalid quantity for ${product.name}` });
            }
            if (qty > product.countInStock) {
                return res.status(400).json({
                    message: `Only ${product.countInStock} left in stock for ${product.name}`
                });
            }

            verifiedItems.push({
                product: product._id,
                name: product.name,
                image: product.image,
                price: product.price,
                qty
            });
        }

        // Same pricing rules the UI shows: free shipping over $100, 15% tax.
        const itemsPrice = round2(verifiedItems.reduce((sum, i) => sum + i.price * i.qty, 0));
        const shippingPrice = itemsPrice > 100 ? 0 : 10;
        const taxPrice = round2(itemsPrice * 0.15);
        const totalPrice = round2(itemsPrice + shippingPrice + taxPrice);

        const order = new Order({
            orderItems: verifiedItems,
            user: req.user._id,
            shippingAddress,
            paymentMethod,
            taxPrice,
            shippingPrice,
            totalPrice
        });

        const createdOrder = await order.save();
        res.status(201).json(createdOrder);
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * @desc    Get order by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate(
            'user',
            'name email'
        );

        if (order) {
            res.json(order);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * @desc    Create a Stripe Checkout Session for an order
 * @route   POST /api/orders/:id/create-checkout-session
 * @access  Private (must be the order's own buyer)
 * @returns {object} { url } - the Stripe-hosted checkout page to redirect to.
 */
const createCheckoutSession = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to pay for this order' });
        }

        if (order.isPaid) {
            return res.status(400).json({ message: 'Order is already paid' });
        }

        if (order.isCancelled) {
            return res.status(400).json({ message: 'Order has been cancelled' });
        }

        // `isPaid` above is set by the webhook, so it still reads false while
        // a completed payment is in flight. Confirm with Stripe before taking
        // another one — this is the only thing standing between an impatient
        // second click and a second charge.
        if (await settleIfSessionAlreadyPaid(order)) {
            return res.status(400).json({ message: 'Order is already paid' });
        }

        // Take the stock now, before sending the buyer off to pay. Reserving
        // here rather than on payment closes the window where two people
        // could both be paying for the same last unit.
        //
        // Re-entering checkout on an order that already holds its stock must
        // not take a second helping, so this is skipped when already reserved.
        if (!order.stockReserved) {
            const reserved = await reserveStock(order.orderItems);

            if (!reserved.ok) {
                return res.status(400).json({
                    message: `${reserved.failedItem.name} no longer has enough stock to complete this order`
                });
            }

            order.stockReserved = true;
            await order.save();
        }

        // Re-entering checkout mints a fresh session, so void the old one.
        // Leaving both open would let the buyer pay twice for one order.
        await expireCheckoutSession(order.checkoutSessionId);

        const lineItems = order.orderItems.map((item) => ({
            price_data: {
                currency: 'usd',
                product_data: { name: item.name },
                unit_amount: Math.round(item.price * 100)
            },
            quantity: item.qty
        }));

        // Shipping + tax are collapsed into one line item rather than
        // itemized further, matching how the rest of the app already
        // displays them as a single combined figure.
        const shippingAndTax = order.shippingPrice + order.taxPrice;
        if (shippingAndTax > 0) {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: { name: 'Shipping & Tax' },
                    unit_amount: Math.round(shippingAndTax * 100)
                },
                quantity: 1
            });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: lineItems,
            // The webhook (the only thing that actually marks an order paid)
            // reads this back to know which order a completed session belongs to.
            metadata: { orderId: order._id.toString() },
            // Stripe's default session lifetime is 24 hours, which would hold
            // inventory hostage for a day after an abandoned checkout. 30
            // minutes is the shortest Stripe allows and is plenty to pay.
            // When it lapses Stripe sends checkout.session.expired, and the
            // webhook hands the stock back.
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
            success_url: `${process.env.CLIENT_URL}/order/${order._id}?payment=success`,
            cancel_url: `${process.env.CLIENT_URL}/order/${order._id}?payment=canceled`
        });

        order.checkoutSessionId = session.id;
        await order.save();

        res.json({ url: session.url });
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * @desc    Stripe webhook — the only thing that actually marks an order paid.
 *          Requires the raw request body for signature verification, so this
 *          route is mounted in server.js with express.raw(), before the
 *          global express.json() middleware would otherwise consume it.
 * @route   POST /api/orders/webhook
 * @access  Public (authenticated via Stripe's signature instead of a JWT)
 */
const stripeWebhookHandler = async (req, res) => {
    const signature = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
        return res.status(400).send(`Webhook signature verification failed: ${error.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const order = await Order.findById(session.metadata.orderId);

        // Racing the buyer: they may have paid on a checkout page that was
        // open when the order got cancelled, or paid a second session for an
        // order already settled by a different one.
        const paidTwice = order?.isPaid && order.paymentResult?.id !== session.payment_intent;

        if (order && (order.isCancelled || paidTwice)) {
            // Refusing to mark it paid isn't enough — the buyer has been
            // charged for something nobody is going to ship, so give it back.
            // Stripe rejects refunding an already-refunded payment, which
            // conveniently makes a replayed event a no-op.
            try {
                const refund = await stripe.refunds.create({
                    payment_intent: session.payment_intent,
                    reason: 'requested_by_customer'
                });
                order.refunds.push({
                    id: refund.id,
                    amount: refund.amount / 100,
                    status: refund.status
                });
                await order.save();
            } catch (error) {
                console.error(
                    `Could not auto-refund payment ${session.payment_intent} on order ${order._id}: ${error.message}`
                );
            }
        } else if (order && !order.isPaid) {
            await applyPaidSession(order, session);
        }
    }

    // The buyer walked away and the session lapsed: hand the stock back so
    // it stops being held for a sale that isn't happening.
    if (event.type === 'checkout.session.expired') {
        const session = event.data.object;
        const order = await Order.findById(session.metadata?.orderId);

        if (order && order.stockReserved && !order.isPaid) {
            await releaseStock(order.orderItems);
            order.stockReserved = false;
            await order.save();
        }
    }

    res.status(200).json({ received: true });
};

const parsePagination = (query, defaultLimit = 10) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || defaultLimit);
    return { page, limit, skip: (page - 1) * limit };
};

/**
 * Translates a `status` query param into the stored boolean flags it means.
 * "pending" specifically means paid-but-not-yet-shipped, matching the badge
 * these tables already render — an order that's merely unpaid isn't
 * "pending" in that sense, it's "unpaid".
 * @param {string} status
 * @returns {object} A Mongo filter fragment, or {} for an unrecognised/empty status.
 */
const ORDER_STATUS_FILTERS = {
    paid: { isPaid: true, isCancelled: { $ne: true } },
    unpaid: { isPaid: false, isCancelled: { $ne: true } },
    delivered: { isDelivered: true },
    pending: { isPaid: true, isDelivered: false, isCancelled: { $ne: true } },
    cancelled: { isCancelled: true }
};

/**
 * @desc    Get all orders, optionally filtered by buyer keyword and status,
 *          paginated
 * @route   GET /api/orders?page=&limit=&keyword=&status=
 * @access  Private (Admin)
 */
const getAllOrders = async (req, res) => {
    try {
        const filter = { ...(ORDER_STATUS_FILTERS[req.query.status] || {}) };

        // Order documents don't carry the buyer's name/email themselves, so
        // a keyword search has to resolve to User ids first, then filter
        // orders by that set — a plain Order.find() can't regex-match a
        // field that only exists on the populated ref.
        if (req.query.keyword) {
            const pattern = { $regex: escapeRegex(req.query.keyword), $options: 'i' };
            const matchingUsers = await User.find({ $or: [{ name: pattern }, { email: pattern }] }).select('_id');
            filter.user = { $in: matchingUsers.map((u) => u._id) };
        }

        const { page, limit, skip } = parsePagination(req.query);

        const [orders, total] = await Promise.all([
            Order.find(filter).populate('user', 'name email').sort('-createdAt').skip(skip).limit(limit),
            Order.countDocuments(filter)
        ]);

        res.json({ orders, page, pages: Math.max(1, Math.ceil(total / limit)), total });
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * @desc    Get logged in user orders, optionally filtered by status and a
 *          product-name keyword, paginated
 * @route   GET /api/orders/myorders?page=&limit=&keyword=&status=
 * @access  Private
 */
const getMyOrders = async (req, res) => {
    try {
        const filter = { user: req.user._id, ...(ORDER_STATUS_FILTERS[req.query.status] || {}) };

        // Mongo treats a dotted path into an array of subdocuments as "any
        // element matches" — no $elemMatch needed for a single-field check.
        if (req.query.keyword) {
            filter['orderItems.name'] = { $regex: escapeRegex(req.query.keyword), $options: 'i' };
        }

        const { page, limit, skip } = parsePagination(req.query);

        const [orders, total] = await Promise.all([
            Order.find(filter).sort('-createdAt').skip(skip).limit(limit),
            Order.countDocuments(filter)
        ]);

        res.json({ orders, page, pages: Math.max(1, Math.ceil(total / limit)), total });
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * @desc    Get orders containing any of the logged-in seller's products,
 *          paginated
 * @route   GET /api/orders/sellerorders?page=&limit=
 * @access  Private (Seller/Admin)
 * @returns Orders trimmed to just this seller's line items, plus a computed
 *          `sellerTotal` (revenue from just those items) and
 *          `sellerDelivered` (whether *this seller's* items have shipped,
 *          which is what they can actually control — the order-level
 *          isDelivered also waits on other sellers).
 */
const getSellerOrders = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);

        const myProducts = await Product.find({ user: req.user._id }).select('_id');
        const myProductIds = myProducts.map((p) => p._id.toString());
        const filter = { 'orderItems.product': { $in: myProductIds } };

        const [orders, total] = await Promise.all([
            Order.find(filter).populate('user', 'name email').sort('-createdAt').skip(skip).limit(limit),
            Order.countDocuments(filter)
        ]);

        const sellerOrders = orders.map((order) => {
            const sellerItems = order.orderItems.filter((item) =>
                myProductIds.includes(item.product.toString())
            );
            const sellerTotal = sellerItems.reduce((sum, item) => sum + item.price * item.qty, 0);

            return {
                _id: order._id,
                user: order.user,
                orderItems: sellerItems,
                sellerTotal,
                sellerDelivered: sellerItems.every((item) => item.isDelivered),
                isPaid: order.isPaid,
                paidAt: order.paidAt,
                isDelivered: order.isDelivered,
                deliveredAt: order.deliveredAt,
                isCancelled: order.isCancelled,
                cancelledAt: order.cancelledAt,
                createdAt: order.createdAt,
            };
        });

        res.json({ orders: sellerOrders, page, pages: Math.max(1, Math.ceil(total / limit)), total });
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * @desc    Mark this seller's items in an order as delivered
 * @route   PUT /api/orders/:id/deliver
 * @access  Private (Seller/Admin — must own at least one item in the order)
 * @note    A seller only ships their own line items, so this marks just
 *          those. Admins act for everyone and mark whatever is still
 *          outstanding. The order-level isDelivered flag flips only once
 *          every item has shipped.
 */
const markOrderDelivered = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Admins can fulfil the whole order; sellers only their own items.
        let myItems;
        if (req.user.role === 'admin') {
            myItems = order.orderItems;
        } else {
            const myProducts = await Product.find({ user: req.user._id }).select('_id');
            const myProductIds = myProducts.map((p) => p._id.toString());
            myItems = order.orderItems.filter((item) => myProductIds.includes(item.product.toString()));

            if (myItems.length === 0) {
                return res.status(401).json({ message: 'Not authorized to update this order' });
            }
        }

        if (order.isCancelled) {
            return res.status(400).json({ message: 'Order has been cancelled' });
        }

        if (!order.isPaid) {
            return res.status(400).json({ message: 'Order must be paid before it can be marked delivered' });
        }

        const pendingItems = myItems.filter((item) => !item.isDelivered);
        if (pendingItems.length === 0) {
            return res.status(400).json({ message: 'Your items are already marked delivered' });
        }

        const now = Date.now();
        pendingItems.forEach((item) => {
            item.isDelivered = true;
            item.deliveredAt = now;
        });

        // The order counts as delivered only when nothing is outstanding.
        if (order.orderItems.every((item) => item.isDelivered)) {
            order.isDelivered = true;
            order.deliveredAt = now;
        }

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } catch (error) {
        sendError(res, error);
    }
};

/**
 * @desc    Cancel an order, refunding it through Stripe if it was paid
 * @route   PUT /api/orders/:id/cancel
 * @access  Private (the order's buyer, or an admin)
 * @note    Refunding restores the stock that was decremented when the
 *          payment landed. Once anything has shipped the order is no longer
 *          cancellable here — that becomes a returns problem, which this app
 *          deliberately doesn't model.
 */
const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const isOwner = order.user.toString() === req.user._id.toString();
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized to cancel this order' });
        }

        if (order.isCancelled) {
            return res.status(400).json({ message: 'Order is already cancelled' });
        }

        if (order.orderItems.some((item) => item.isDelivered)) {
            return res.status(400).json({ message: 'Items in this order have already shipped and cannot be cancelled' });
        }

        // Refund first: if Stripe rejects it, the order stays open rather
        // than being cancelled with the buyer's money still taken.
        if (order.isPaid) {
            if (!order.paymentResult?.id) {
                return res.status(400).json({ message: 'No payment reference on file to refund' });
            }

            const refund = await stripe.refunds.create({
                payment_intent: order.paymentResult.id,
                reason: 'requested_by_customer'
            });

            order.refunds.push({
                id: refund.id,
                amount: refund.amount / 100,
                status: refund.status
            });
        } else {
            // Not paid yet, but a checkout page may still be open in a tab.
            // Void it, or the buyer could pay for an order we just cancelled.
            await expireCheckoutSession(order.checkoutSessionId);
        }

        order.checkoutSessionId = undefined;

        // Hand back whatever this order was holding. Keyed off the reservation
        // rather than payment, so an order abandoned mid-checkout — reserved
        // but never paid — releases its stock too.
        if (order.stockReserved) {
            await releaseStock(order.orderItems);
            order.stockReserved = false;
        }

        order.isCancelled = true;
        order.cancelledAt = Date.now();
        order.cancelReason = (req.body?.reason || '').trim() || undefined;

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } catch (error) {
        sendError(res, error);
    }
};

module.exports = {
    addOrderItems,
    getOrderById,
    createCheckoutSession,
    stripeWebhookHandler,
    getAllOrders,
    getMyOrders,
    getSellerOrders,
    markOrderDelivered,
    cancelOrder
};
