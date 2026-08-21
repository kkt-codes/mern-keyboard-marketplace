const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');

/**
 * Escapes regex metacharacters in user-supplied search input.
 * Without this, a keyword like `.*` or `(a+)+` passed straight into
 * `$regex` could match everything or cause catastrophic backtracking (ReDoS).
 * @param {string} text
 * @returns {string}
 */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORT_OPTIONS = {
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 }
};

/**
 * @desc    Fetch products, optionally filtered by keyword/category/price range,
 *          sorted, and paginated.
 * @route   GET /api/products?keyword=&category=&minPrice=&maxPrice=&sort=&page=&limit=
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

        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
        }

        const sort = SORT_OPTIONS[req.query.sort] || SORT_OPTIONS.newest;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 12);
        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            // Seller name rides along for display (marketplace listings are
            // public anyway); email etc. stays private.
            Product.find(filter).populate('user', 'name').sort(sort).skip(skip).limit(limit),
            Product.countDocuments(filter)
        ]);

        res.json({
            products,
            page,
            pages: Math.max(1, Math.ceil(total / limit)),
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Fetch products belonging to the logged-in seller, paginated
 * @route   GET /api/products/myproducts?page=&limit=
 * @access  Private (Seller/Admin)
 */
const getMyProducts = async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 10);
        const skip = (page - 1) * limit;
        const filter = { user: req.user._id };

        const [products, total] = await Promise.all([
            Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Product.countDocuments(filter)
        ]);

        res.json({ products, page, pages: Math.max(1, Math.ceil(total / limit)), total });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Fetch the logged-in user's bookmarked products
 * @route   GET /api/products/bookmarks/mine
 * @access  Private
 */
const getMyBookmarks = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('bookmarks');
        res.json(user.bookmarks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Toggle a bookmark on/off for the logged-in user
 * @route   POST /api/products/:id/bookmark
 * @access  Private
 */
const toggleBookmark = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const user = await User.findById(req.user._id);
        const index = user.bookmarks.findIndex((id) => id.toString() === req.params.id);

        let bookmarked;
        if (index === -1) {
            user.bookmarks.push(product._id);
            bookmarked = true;
        } else {
            user.bookmarks.splice(index, 1);
            bookmarked = false;
        }

        await user.save();
        res.json({ bookmarked });
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
 * @desc    Add a review to a product
 * @route   POST /api/products/:id/reviews
 * @access  Private (must have a paid order containing this product)
 */
const createProductReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const alreadyReviewed = product.reviews.some(
            (review) => review.user.toString() === req.user._id.toString()
        );
        if (alreadyReviewed) {
            return res.status(400).json({ message: 'You have already reviewed this product' });
        }

        // Only someone with a paid, non-cancelled order containing this
        // product may review it — a refunded purchase shouldn't earn a
        // verified review.
        const hasPurchased = await Order.exists({
            user: req.user._id,
            isPaid: true,
            isCancelled: { $ne: true },
            'orderItems.product': product._id
        });
        if (!hasPurchased) {
            return res.status(403).json({ message: 'You can only review products you have purchased' });
        }

        const review = {
            user: req.user._id,
            name: req.user.name,
            rating: Number(rating),
            comment
        };

        product.reviews.push(review);
        product.numReviews = product.reviews.length;
        product.rating =
            product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length;

        await product.save();
        res.status(201).json(product);
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
    getMyBookmarks,
    toggleBookmark,
    getProductById,
    createProduct,
    createProductReview,
    updateProduct,
    deleteProduct
};
