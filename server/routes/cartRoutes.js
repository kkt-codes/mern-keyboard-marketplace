const express = require('express');
const router = express.Router();
const { getCart, replaceCart, mergeCart } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

// The cart belongs to a signed-in user; guests keep theirs in the browser.
router.use(protect);

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get the logged-in user's saved cart
 *     description: Items are hydrated from live Product data, so prices are never stale. Lines whose product was deleted or sold out are dropped, and quantities above available stock are capped.
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: The saved cart, each line being a product plus its quantity.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Product'
 *                   - type: object
 *                     properties:
 *                       qty: { type: integer, example: 2 }
 *   put:
 *     summary: Replace the logged-in user's cart
 *     description: Sends the complete cart, so adds, removals and quantity changes all use this one endpoint. Repeating a request is harmless.
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [product, qty]
 *                   properties:
 *                     product: { type: string, description: Product id }
 *                     qty: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: The saved cart after the replace.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Product'
 *                   - type: object
 *                     properties:
 *                       qty: { type: integer }
 */
router.route('/').get(getCart).put(replaceCart);

/**
 * @swagger
 * /cart/merge:
 *   post:
 *     summary: Merge a guest cart into the saved cart
 *     description: Called right after login. Quantities for a product in both carts are added together, then capped at available stock. An empty list is a no-op, so this is safe to call on every login.
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 description: The guest cart held in the browser before signing in.
 *                 items:
 *                   type: object
 *                   required: [product, qty]
 *                   properties:
 *                     product: { type: string, description: Product id }
 *                     qty: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: The merged cart.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Product'
 *                   - type: object
 *                     properties:
 *                       qty: { type: integer }
 */
router.route('/merge').post(mergeCart);

module.exports = router;
