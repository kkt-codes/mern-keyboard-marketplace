const Product = require('../models/Product');

/**
 * Escapes regex metacharacters in user-supplied search input.
 * Without this, a keyword like `.*` or `(a+)+` passed straight into
 * `$regex` could match everything or cause catastrophic backtracking (ReDoS).
 * @param {string} text
 * @returns {string}
 */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @desc    Fetch all products, optionally filtered by keyword (name) and/or category
 * @route   GET /api/products?keyword=&category=
 * @access  Public
 */
const getProducts = async (req, res) => {
    try {
        const filter = {};

        if (req.query.keyword) {
            filter.name = { $regex: escapeRegex(req.query.keyword), $options: 'i' };
        }

        if (req.query.category) {
            filter.category = { $regex: `^${escapeRegex(req.query.category)}$`, $options: 'i' };
        }

        const products = await Product.find(filter);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Fetch products belonging to the logged-in seller
 * @route   GET /api/products/myproducts
 * @access  Private (Seller/Admin)
 */
const getMyProducts = async (req, res) => {
    try {
        const products = await Product.find({ user: req.user._id });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Fetch single product
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Create a product
 * @route   POST /api/products
 * @access  Private (Seller/Admin)
 */
const createProduct = async (req, res) => {
    try {
        const { name, price, description, image, brand, category, countInStock } = req.body;

        const product = new Product({
            name,
            price,
            user: req.user._id, // From authMiddleware
            image,
            brand,
            category,
            countInStock,
            description
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update a product
 * @route   PUT /api/products/:id
 * @access  Private (Seller/Admin)
 */
const updateProduct = async (req, res) => {
    try {
        const { name, price, description, image, brand, category, countInStock } = req.body;

        const product = await Product.findById(req.params.id);

        if (product) {
            // Check ownership or admin role
            if (product.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(401).json({ message: 'Not authorized to update this product' });
            }

            product.name = name || product.name;
            product.price = price || product.price;
            product.description = description || product.description;
            product.image = image || product.image;
            product.brand = brand || product.brand;
            product.category = category || product.category;
            product.countInStock = countInStock || product.countInStock;

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Private (Seller/Admin)
 */
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            // Check ownership or admin role
            if (product.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(401).json({ message: 'Not authorized to delete this product' });
            }

            await product.deleteOne();
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getProducts,
    getMyProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};
