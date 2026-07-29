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

router.route('/')
    .get(getProducts)
    .post(protect, authorize('seller', 'admin'), createProduct);

// Must come before /:id, or Express would match "myproducts" as an :id param.
router.route('/myproducts').get(protect, authorize('seller', 'admin'), getMyProducts);

router.route('/:id')
    .get(getProductById)
    .put(protect, authorize('seller', 'admin'), updateProduct)
    .delete(protect, authorize('seller', 'admin'), deleteProduct);

module.exports = router;
