const mongoose = require('mongoose');

/**
 * Review Schema
 * Embedded in Product — one entry per user who has reviewed it.
 * `name` is denormalized from the reviewing user at write time so the
 * product detail page doesn't need a separate populate/lookup to render it.
 */
const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    name: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: [true, 'Please add a comment']
    }
}, {
    timestamps: true
});

/**
 * Product Schema
 * Defines the structure for Product documents.
 */
const productSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User' // Relationship with User model (Seller)
    },
    name: {
        type: String,
        required: [true, 'Please add a product name']
    },
    image: {
        type: String,
        required: [true, 'Please add an image URL']
    },
    brand: {
        type: String,
        required: [true, 'Please add a brand']
    },
    category: {
        type: String,
        required: [true, 'Please add a category']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    price: {
        type: Number,
        required: [true, 'Please add a price'],
        default: 0
    },
    countInStock: {
        type: Number,
        required: [true, 'Please add stock count'],
        default: 0
    },
    reviews: [reviewSchema],
    rating: {
        type: Number,
        required: true,
        default: 0
    },
    numReviews: {
        type: Number,
        required: true,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
