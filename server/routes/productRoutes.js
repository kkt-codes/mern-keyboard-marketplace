const express = require('express');
const router = express.Router();
const {
    getProducts,
    getMyProducts,
    getMyBookmarks,
    toggleBookmark,
    getProductById,
    createProduct,
    createProductReview,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List products, filtered/sorted/paginated
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
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [newest, price_asc, price_desc] }
 *         description: Defaults to newest.
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *     responses:
 *       200:
 *         description: A page of matching products.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Product' }
 *                 page: { type: integer }
 *                 pages: { type: integer }
 *                 total: { type: integer }
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
 *     summary: List the logged-in seller's own products, paginated
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, default: 10 }
 *       - in: query
 *         name: keyword
 *         description: Case-insensitive match against the product name.
 *         schema: { type: string }
 *       - in: query
 *         name: lowStock
 *         description: Set to "true" to only show products below the low-stock threshold.
 *         schema: { type: string, enum: ['true'] }
 *     responses:
 *       200:
 *         description: One page of products owned by the current user, newest first.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Product' }
 *                 page: { type: integer }
 *                 pages: { type: integer }
 *                 total: { type: integer }
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
 * /products/bookmarks/mine:
 *   get:
 *     summary: List the logged-in user's bookmarked products
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Full product docs for everything the user has bookmarked.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Product' }
 */
// Must come before /:id for the same reason as /myproducts above.
router.route('/bookmarks/mine').get(protect, getMyBookmarks);

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

/**
 * @swagger
 * /products/{id}/bookmark:
 *   post:
 *     summary: Toggle a bookmark on/off for the current user
 *     tags: [Products]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: New bookmark state.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookmarked: { type: boolean }
 *       404:
 *         description: Product not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.route('/:id/bookmark').post(protect, toggleBookmark);

/**
 * @swagger
 * /products/{id}/reviews:
 *   post:
 *     summary: Add a review to a product
 *     description: Only allowed if the logged-in user has a paid order containing this product, and hasn't already reviewed it.
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
 *           schema:
 *             type: object
 *             required: [rating, comment]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *     responses:
 *       201:
 *         description: The updated product, including the new review.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *       400:
 *         description: Already reviewed this product.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Hasn't purchased this product.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Product not found.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.route('/:id/reviews').post(protect, createProductReview);

module.exports = router;
