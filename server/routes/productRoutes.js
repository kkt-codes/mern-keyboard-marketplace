const express = require('express');
const router = express.Router();
const {
    getProducts,
    getMyProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List products, optionally filtered by keyword and/or category
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema: { type: string }
 *         description: Case-insensitive substring match against product name.
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Case-insensitive exact match against product category.
 *     responses:
 *       200:
 *         description: All products in the catalog.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Product' }
 *   post:
 *     summary: Create a product
 *     description: Requires the seller or admin role.
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProductInput' }
 *     responses:
 *       201:
 *         description: The created product.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *       403:
 *         description: Logged in but not a seller/admin.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.route('/')
    .get(getProducts)
    .post(protect, authorize('seller', 'admin'), createProduct);

/**
 * @swagger
 * /products/myproducts:
 *   get:
 *     summary: List the logged-in seller's own products
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Products owned by the current user.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Product' }
 *       403:
 *         description: Logged in but not a seller/admin.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
// Must come before /:id, or Express would match "myproducts" as an :id param.
router.route('/myproducts').get(protect, authorize('seller', 'admin'), getMyProducts);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a single product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The requested product.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *       404:
 *         description: Product not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   put:
 *     summary: Update a product
 *     description: Requires the seller/admin role and ownership of the product (admins can edit any product).
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProductInput' }
 *     responses:
 *       200:
 *         description: The updated product.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *       401:
 *         description: Logged in, but doesn't own this product.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Logged in but not a seller/admin.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   delete:
 *     summary: Delete a product
 *     description: Requires the seller/admin role and ownership of the product (admins can delete any product).
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product removed.
 *       401:
 *         description: Logged in, but doesn't own this product.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Logged in but not a seller/admin.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.route('/:id')
    .get(getProductById)
    .put(protect, authorize('seller', 'admin'), updateProduct)
    .delete(protect, authorize('seller', 'admin'), deleteProduct);

module.exports = router;
