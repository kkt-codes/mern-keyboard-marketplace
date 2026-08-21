const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    orderItems: [
        {
            name: { type: String, required: true },
            qty: { type: Number, required: true },
            image: { type: String, required: true },
            price: { type: Number, required: true },
            product: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                ref: 'Product'
            },
            // Delivery is tracked per line item because one order can span
            // several sellers, and each only controls their own items. The
            // order-level isDelivered below is derived from these.
            isDelivered: { type: Boolean, required: true, default: false },
            deliveredAt: { type: Date }
        }
    ],
    shippingAddress: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true }
    },
    paymentMethod: {
        type: String,
        required: true
    },
    paymentResult: {
        id: { type: String },
        status: { type: String },
        update_time: { type: String },
        email_address: { type: String }
    },
    taxPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    shippingPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    isPaid: {
        type: Boolean,
        required: true,
        default: false
    },
    paidAt: {
        type: Date
    },
    // Derived: true only once every line item has been delivered. Kept as a
    // stored field so buyer-facing lists can filter/display without having
    // to walk orderItems on every read.
    isDelivered: {
        type: Boolean,
        required: true,
        default: false
    },
    deliveredAt: {
        type: Date
    },
    isCancelled: {
        type: Boolean,
        required: true,
        default: false
    },
    cancelledAt: {
        type: Date
    },
    cancelReason: {
        type: String
    },
    // Populated when a paid order is cancelled and Stripe refunds it.
    refundResult: {
        id: { type: String },
        amount: { type: Number },
        status: { type: String }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
