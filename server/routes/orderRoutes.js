const express = require('express');
const router = express.Router();
const {
    addOrderItems,
    getOrderById,
    createCheckoutSession,
    getMyOrders,
    getSellerOrders
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order from the current cart
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderItems, shippingAddress, paymentMethod, taxPrice, shippingPrice, totalPrice]
 *             properties:
 *               orderItems:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/OrderItem' }
 *               shippingAddress: { $ref: '#/components/schemas/ShippingAddress' }
 *               paymentMethod: { type: string, example: Stripe }
 *               taxPrice: { type: number }
 *               shippingPrice: { type: number }
 *               totalPrice: { type: number }
 *     responses:
 *       201:
 *         description: The created order.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       400:
 *         description: No order items provided.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.route('/').post(protect, addOrderItems);

/**
 * @swagger
 * /orders/myorders:
 *   get:
 *     summary: List the logged-in user's own orders
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Orders placed by the current user.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Order' }
 */
router.route('/myorders').get(protect, getMyOrders);

/**
 * @swagger
 * /orders/sellerorders:
 *   get:
 *     summary: List orders containing the logged-in seller's products
 *     description: Requires the seller or admin role. Each order is trimmed to just this seller's line items, plus a computed sellerTotal.
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Orders touching this seller's products.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Order'
 *                   - type: object
 *                     properties:
 *                       sellerTotal: { type: number }
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
 *     description: Only the order's own buyer can start this, and only if the order isn't already paid. The order isn't actually marked paid until Stripe confirms via webhook, not from this response.
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
 *         description: Order is already paid.
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

module.exports = router;
