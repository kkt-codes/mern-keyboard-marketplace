const cloudinary = require('cloudinary').v2;

/**
 * Configures the Cloudinary SDK from environment variables.
 * Used by uploadController to host product images.
 */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;
