const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controllers/uploadController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

/**
 * multer's own errors (file too large, wrong type) are passed to `next(err)`
 * rather than thrown, which would otherwise fall through to Express's
 * default HTML error page since this project has no centralized error
 * handler. Catching it here keeps the response JSON, consistent with the
 * rest of the API.
 */
const uploadSingleImage = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
};

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload a product image
 *     description: Requires the seller or admin role. Returns the hosted Cloudinary URL to use as a product's `image` field.
 *     tags: [Upload]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: JPEG, PNG, or WebP, up to 5MB.
 *     responses:
 *       201:
 *         description: Upload succeeded.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string, format: uri }
 *       400:
 *         description: No file uploaded, or invalid file type/size.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Logged in but not a seller/admin.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', protect, authorize('seller', 'admin'), uploadSingleImage, uploadImage);

module.exports = router;
