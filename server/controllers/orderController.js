const Order = require('../models/Order');
const Product = require('../models/Product');

/**
 * @desc    Create new order
 * @route   POST /api/orders
 * @access  Private
 */
const addOrderItems = async (req, res) => {
    try {
        const {
            orderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            taxPrice,
            shippingPrice,
            totalPrice
        } = req.body;

        if (orderItems && orderItems.length === 0) {
            res.status(400).json({ message: 'No order items' });
            return;
        } else {
            const order = new Order({
                orderItems,
                user: req.user._id,
                shippingAddress,
                paymentMethod,
                itemsPrice,
                taxPrice,
                shippingPrice,
                totalPrice
            });

            const createdOrder = await order.save();

            res.status(201).json(createdOrder);
        }
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
 * @desc    Update order to paid
 * @route   PUT /api/orders/:id/pay
 * @access  Private
 */
const updateOrderToPaid = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (order) {
            order.isPaid = true;
            order.paidAt = Date.now();
            order.paymentResult = {
                id: req.body.id,
                status: req.body.status,
                update_time: req.body.update_time,
                email_address: req.body.payer.email_address
            };

            const updatedOrder = await order.save();

            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get logged in user orders
 * @route   GET /api/orders/myorders
 * @access  Private
 */
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort('-createdAt');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get orders containing any of the logged-in seller's products
 * @route   GET /api/orders/sellerorders
 * @access  Private (Seller/Admin)
 * @returns {object[]} Orders trimmed to just this seller's line items, plus
 *          a computed `sellerTotal` (revenue from just those items).
 */
const getSellerOrders = async (req, res) => {
    try {
        const myProducts = await Product.find({ user: req.user._id }).select('_id');
        const myProductIds = myProducts.map((p) => p._id.toString());

        const orders = await Order.find({ 'orderItems.product': { $in: myProductIds } })
            .populate('user', 'name email')
            .sort('-createdAt');

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

        res.json(sellerOrders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    addOrderItems,
    getOrderById,
    updateOrderToPaid,
    getMyOrders,
    getSellerOrders
};
