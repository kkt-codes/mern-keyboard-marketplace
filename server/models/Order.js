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
    // The Stripe Checkout session currently open for this order, kept so it
    // can be voided if the order is cancelled — otherwise the buyer could
    // still pay on a page we've already stopped honouring.
    checkoutSessionId: {
        type: String
    },
    // True while this order is physically holding inventory. Stock is taken
    // when checkout starts (not when payment lands), so it can't be sold to
    // someone else while the buyer is on Stripe's payment page. Released if
    // the session expires or the order is cancelled/refunded.
    stockReserved: {
        type: Boolean,
        required: true,
        default: false
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
    /**
     * Every refund issued against this order.
     *
     * A list rather than a single record because an order genuinely can be
     * refunded more than once: when a webhook lags, a buyer can pay twice,
     * and each payment has to be given back separately. Holding one object
     * meant the second refund overwrote the first, so the order reported
     * less money returned than actually was.
     */
    refunds: [
        {
            id: { type: String, required: true },
            amount: { type: Number, required: true },
            status: { type: String },
            createdAt: { type: Date, default: Date.now }
        }
    ]
}, {
    timestamps: true
});

/** Total value refunded, across however many refunds it took. */
orderSchema.virtual('refundedTotal').get(function () {
    return Math.round(this.refunds.reduce((sum, r) => sum + r.amount, 0) * 100) / 100;
});

orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);
