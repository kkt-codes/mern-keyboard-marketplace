const cloudinary = require('../config/cloudinary');

/**
 * @desc    Upload a product image to Cloudinary
 * @route   POST /api/upload
 * @access  Private (Seller/Admin)
 */
const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // The upload destination folder is hardcoded here, never taken from
        // user input — Cloudinary's Node SDK has a known argument-injection
        // issue (CVE-2025-12613, fixed in 2.7.0) when untrusted strings reach
        // its API parameters, so nothing from req.body/req.query is ever
        // passed through to the SDK call below.
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'mern-keyboard-marketplace' },
                (error, uploadResult) => {
                    if (error) reject(error);
                    else resolve(uploadResult);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        res.status(201).json({ url: result.secure_url });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { uploadImage };
