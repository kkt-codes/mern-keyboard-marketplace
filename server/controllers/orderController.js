const Order = require('../models/Order');
const Product = require('../models/Product');
const stripe = require('../config/stripe');

const round2 = (n) => Math.round(n * 100) / 100;

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
        res.status(500).json({ message: error.message });
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
        res.status(500).json({ message: error.message });
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

        // Stock isn't reserved at order creation, so re-check it here —
        // someone else may have bought the last unit since then. This
        // narrows the oversell window to the Stripe checkout itself.
        const products = await Product.find({
            _id: { $in: order.orderItems.map((item) => item.product) }
        });
        const productById = new Map(products.map((p) => [p._id.toString(), p]));
        for (const item of order.orderItems) {
            const product = productById.get(item.product.toString());
            if (!product || product.countInStock < item.qty) {
                return res.status(400).json({
                    message: `${item.name} no longer has enough stock to complete this order`
                });
            }
        }

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
            success_url: `${process.env.CLIENT_URL}/order/${order._id}?payment=success`,
            cancel_url: `${process.env.CLIENT_URL}/order/${order._id}?payment=canceled`
        });

        res.json({ url: session.url });
    } catch (error) {
        res.status(500).json({ message: error.message });
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

        if (order && !order.isPaid) {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentResult = {
                id: session.payment_intent,
                status: session.payment_status,
                update_time: new Date().toISOString(),
                email_address: session.customer_details?.email || ''
            };
            await order.save();

            // Payment is confirmed — this is the point stock actually leaves
            // the shelf. The pipeline-style update clamps at 0 so a race
            // between two checkouts can't drive countInStock negative.
            await Product.bulkWrite(
                order.orderItems.map((item) => ({
                    updateOne: {
                        filter: { _id: item.product },
                        update: [
                            {
                                $set: {
                                    countInStock: {
                                        $max: [0, { $subtract: ['$countInStock', item.qty] }]
                                    }
                                }
                            }
                        ]
                    }
                }))
            );
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
 * @desc    Get all orders, paginated
 * @route   GET /api/orders?page=&limit=
 * @access  Private (Admin)
 */
const getAllOrders = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);

        const [orders, total] = await Promise.all([
            Order.find({}).populate('user', 'name email').sort('-createdAt').skip(skip).limit(limit),
            Order.countDocuments({})
        ]);

        res.json({ orders, page, pages: Math.max(1, Math.ceil(total / limit)), total });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get logged in user orders, paginated
 * @route   GET /api/orders/myorders?page=&limit=
 * @access  Private
 */
const getMyOrders = async (req, res) => {
    try {
        const { page, limit, skip } = parsePagination(req.query);
        const filter = { user: req.user._id };

        const [orders, total] = await Promise.all([
            Order.find(filter).sort('-createdAt').skip(skip).limit(limit),
            Order.countDocuments(filter)
        ]);

        res.json({ orders, page, pages: Math.max(1, Math.ceil(total / limit)), total });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get orders containing any of the logged-in seller's products,
 *          paginated
 * @route   GET /api/orders/sellerorders?page=&limit=
 * @access  Private (Seller/Admin)
 * @returns Orders trimmed to just this seller's line items, plus a computed
 *          `sellerTotal` (revenue from just those items).
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
                isPaid: order.isPaid,
                paidAt: order.paidAt,
                isDelivered: order.isDelivered,
                deliveredAt: order.deliveredAt,
                createdAt: order.createdAt,
            };
        });

        res.json({ orders: sellerOrders, page, pages: Math.max(1, Math.ceil(total / limit)), total });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Mark an order as delivered
 * @route   PUT /api/orders/:id/deliver
 * @access  Private (Seller/Admin — must own at least one item in the order)
 * @note    Delivery status is a single flag on the whole order, not tracked
 *          per seller/item, so any seller with a stake in a multi-seller
 *          order can mark the entire thing delivered. Splitting that out
 *          would need a schema change (per-line-item delivery status) this
 *          app doesn't have.
 */
const markOrderDelivered = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (req.user.role !== 'admin') {
            const myProducts = await Product.find({ user: req.user._id }).select('_id');
            const myProductIds = myProducts.map((p) => p._id.toString());
            const ownsAnItem = order.orderItems.some((item) => myProductIds.includes(item.product.toString()));

            if (!ownsAnItem) {
                return res.status(401).json({ message: 'Not authorized to update this order' });
            }
        }

        if (!order.isPaid) {
            return res.status(400).json({ message: 'Order must be paid before it can be marked delivered' });
        }

        if (order.isDelivered) {
            return res.status(400).json({ message: 'Order is already marked delivered' });
        }

        order.isDelivered = true;
        order.deliveredAt = Date.now();
        const updatedOrder = await order.save();

        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
    markOrderDelivered
};
