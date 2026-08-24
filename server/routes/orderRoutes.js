const express = require('express');
const router = express.Router();
const {
    addOrderItems,
    getOrderById,
    createCheckoutSession,
    getAllOrders,
    getMyOrders,
    getSellerOrders,
    markOrderDelivered,
    cancelOrder
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order from the current cart
 *     description: Only product ids and quantities are taken from the request. Prices, names, images, and all totals are rebuilt from the database server-side, so client-supplied prices are ignored.
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderItems, shippingAddress, paymentMethod]
 *             properties:
 *               orderItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [product, qty]
 *                   properties:
 *                     product: { type: string, description: Product id }
 *                     qty: { type: integer, minimum: 1 }
 *               shippingAddress: { $ref: '#/components/schemas/ShippingAddress' }
 *               paymentMethod: { type: string, example: Stripe }
 *     responses:
 *       201:
 *         description: The created order, with server-computed prices.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       400:
 *         description: No order items, duplicate/unknown products, invalid quantity, or insufficient stock.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   get:
 *     summary: List all orders (admin)
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, default: 10 }
 *     responses:
 *       200:
 *         description: One page of all orders, newest first, buyer populated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Order' }
 *                 page: { type: integer }
 *                 pages: { type: integer }
 *                 total: { type: integer }
 *       403:
 *         description: Logged in but not an admin.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.route('/')
    .post(protect, addOrderItems)
    .get(protect, authorize('admin'), getAllOrders);

/**
 * @swagger
 * /orders/myorders:
 *   get:
 *     summary: List the logged-in user's own orders, paginated
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, default: 10 }
 *     responses:
 *       200:
 *         description: One page of the current user's orders, newest first.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Order' }
 *                 page: { type: integer }
 *                 pages: { type: integer }
 *                 total: { type: integer }
 */
router.route('/myorders').get(protect, getMyOrders);

/**
 * @swagger
 * /orders/sellerorders:
 *   get:
 *     summary: List orders containing the logged-in seller's products, paginated
 *     description: Requires the seller or admin role. Each order is trimmed to just this seller's line items, plus a computed sellerTotal.
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, default: 10 }
 *     responses:
 *       200:
 *         description: One page of orders touching this seller's products.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Order'
 *                       - type: object
 *                         properties:
 *                           sellerTotal: { type: number }
 *                 page: { type: integer }
 *                 pages: { type: integer }
 *                 total: { type: integer }
 *       403:
 *         description: Logged in but not a seller/admin.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
// Must come before /:id, or Express would match "sellerorders" as an :id param.
router.route('/sellerorders').get(protect, authorize('seller', 'admin'), getSellerOrders);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get a single order by ID
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The requested order, with the buyer's name/email populated.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       404:
 *         description: Order not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.route('/:id').get(protect, getOrderById);

/**
 * @swagger
 * /orders/{id}/create-checkout-session:
 *   post:
 *     summary: Start a Stripe Checkout session to pay for an order
 *     description: Only the order's own buyer can start this, and only if the order isn't already paid. Stock is reserved here, before the buyer is sent to Stripe, so nobody else can buy the same units while they pay; it is released if the session expires or the order is cancelled. The order isn't marked paid until Stripe confirms via webhook, not from this response.
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Redirect the browser to this Stripe-hosted checkout URL.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string, format: uri }
 *       400:
 *         description: Order is already paid, was cancelled, or an item sold out before the reservation could be taken.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Logged in, but this isn't your order.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Order not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.route('/:id/create-checkout-session').post(protect, createCheckoutSession);

/**
 * @swagger
 * /orders/{id}/deliver:
 *   put:
 *     summary: Mark this seller's items in an order as delivered
 *     description: Requires the seller or admin role, and the order must already be paid. A seller marks only their own line items; admins mark everything still outstanding. The order-level isDelivered flag flips once every item has shipped.
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The updated order, with this seller's items delivered.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       400:
 *         description: Order isn't paid, was cancelled, or your items are already delivered.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Logged in, but doesn't own any item in this order.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Logged in but not a seller/admin.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Order not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.route('/:id/deliver').put(protect, authorize('seller', 'admin'), markOrderDelivered);

/**
 * @swagger
 * /orders/{id}/cancel:
 *   put:
 *     summary: Cancel an order, refunding it if already paid
 *     description: Open to the order's own buyer or an admin. A paid order is refunded through Stripe and its stock restored. Once any item has shipped the order can no longer be cancelled.
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, example: Ordered the wrong switches }
 *     responses:
 *       200:
 *         description: The cancelled order, including refundResult when a refund was issued.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       400:
 *         description: Already cancelled, items already shipped, or no payment reference to refund.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Logged in, but this isn't your order.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Order not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.route('/:id/cancel').put(protect, cancelOrder);

module.exports = router;
