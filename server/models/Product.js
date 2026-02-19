const mongoose = require('mongoose');

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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
