const {
    request, app, registerUser, createProduct, createOrder, authHeader, sendWebhook, SHIPPING
} = require('./helpers');
const stripe = require('../config/stripe');
const Product = require('../models/Product');
const Order = require('../models/Order');

const stockOf = async (id) => (await Product.findById(id)).countInStock;

const startCheckout = (token, orderId) =>
    request(app).post(`/api/orders/${orderId}/create-checkout-session`).set(authHeader(token));

/** Drives the real webhook path that marks an order paid. */
const payViaWebhook = (orderId, paymentIntent = `pi_test_${orderId}`) =>
    sendWebhook('checkout.session.completed', {
        id: `cs_${orderId}`,
        object: 'checkout.session',
        payment_intent: paymentIntent,
        payment_status: 'paid',
        customer_details: { email: 'buyer@example.com' },
        metadata: { orderId: String(orderId) }
    });

describe('placing an order', () => {
    it('rebuilds prices from the database and ignores what the client sends', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { price: 129.99, name: 'Real Board' });
        const buyer = await registerUser({});

        const res = await request(app)
            .post('/api/orders')
            .set(authHeader(buyer.token))
            .send({
                orderItems: [{ product: product._id, qty: 1, price: 0.01, name: 'hacked' }],
                shippingAddress: SHIPPING,
                paymentMethod: 'Stripe',
                totalPrice: 0.01
            });

        expect(res.status).toBe(201);
        expect(res.body.orderItems[0].price).toBe(129.99);
        expect(res.body.orderItems[0].name).toBe('Real Board');
        // 129.99 items + 0 shipping (over $100) + 15% tax
        expect(res.body.totalPrice).toBe(149.49);
    });

    it('charges shipping on orders at or under $100', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { price: 50 });
        const buyer = await registerUser({});

        const res = await createOrder(buyer.token, [{ product: product._id, qty: 1 }]);

        // 50 + 10 shipping + 7.50 tax
        expect(res.body.shippingPrice).toBe(10);
        expect(res.body.totalPrice).toBe(67.5);
    });

    it('rejects an empty order', async () => {
        const buyer = await registerUser({});
        const res = await createOrder(buyer.token, []);
        expect(res.status).toBe(400);
    });

    it('rejects the same product listed twice', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const buyer = await registerUser({});

        const res = await createOrder(buyer.token, [
            { product: product._id, qty: 1 },
            { product: product._id, qty: 1 }
        ]);

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/duplicate/i);
    });

    it('rejects a fractional or zero quantity', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const buyer = await registerUser({});

        expect((await createOrder(buyer.token, [{ product: product._id, qty: 0.5 }])).status).toBe(400);
        expect((await createOrder(buyer.token, [{ product: product._id, qty: 0 }])).status).toBe(400);
    });

    it('rejects ordering more than exists', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 2 });
        const buyer = await registerUser({});

        const res = await createOrder(buyer.token, [{ product: product._id, qty: 5 }]);

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/only 2 left/i);
    });

    it('does not take stock off the shelf yet', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 5 });
        const buyer = await registerUser({});

        await createOrder(buyer.token, [{ product: product._id, qty: 2 }]);

        expect(await stockOf(product._id)).toBe(5);
    });
});

describe('stock reservation at checkout', () => {
    it('takes the stock when checkout starts', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 5 });
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 2 }]);

        const res = await startCheckout(buyer.token, order.body._id);

        expect(res.status).toBe(200);
        expect(res.body.url).toContain('checkout.stripe.com');
        expect(await stockOf(product._id)).toBe(3);
    });

    it('lets exactly one of two simultaneous checkouts win the last unit', async () => {
        // The whole point of the atomic conditional update: both buyers pass
        // the availability check at order time, then race at checkout.
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 1 });
        const alice = await registerUser({});
        const bob = await registerUser({});

        const aliceOrder = await createOrder(alice.token, [{ product: product._id, qty: 1 }]);
        const bobOrder = await createOrder(bob.token, [{ product: product._id, qty: 1 }]);

        const [aliceRes, bobRes] = await Promise.all([
            startCheckout(alice.token, aliceOrder.body._id),
            startCheckout(bob.token, bobOrder.body._id)
        ]);

        const statuses = [aliceRes.status, bobRes.status].sort();
        expect(statuses).toEqual([200, 400]);
        expect(await stockOf(product._id)).toBe(0);
    });

    it('never lets stock go negative', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 1 });

        const buyers = await Promise.all([registerUser({}), registerUser({}), registerUser({})]);
        const orders = await Promise.all(
            buyers.map((b) => createOrder(b.token, [{ product: product._id, qty: 1 }]))
        );

        await Promise.all(
            orders.map((o, i) => startCheckout(buyers[i].token, o.body._id))
        );

        expect(await stockOf(product._id)).toBe(0);
    });

    it('does not reserve twice when checkout is re-entered', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 5 });
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 2 }]);

        await startCheckout(buyer.token, order.body._id);
        await startCheckout(buyer.token, order.body._id);

        expect(await stockOf(product._id)).toBe(3);
    });

    it('voids the previous Stripe session when checkout is re-entered', async () => {
        // Two live sessions for one order would let the buyer pay twice.
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 1 }]);

        await startCheckout(buyer.token, order.body._id);
        const firstSessionId = (await Order.findById(order.body._id)).checkoutSessionId;

        await startCheckout(buyer.token, order.body._id);
        const secondSessionId = (await Order.findById(order.body._id)).checkoutSessionId;

        expect(secondSessionId).not.toBe(firstSessionId);
        expect(stripe.__getSession(firstSessionId).status).toBe('expired');
        expect(stripe.__getSession(secondSessionId).status).toBe('open');
    });

    it('reserves nothing at all when one line of a multi-item order cannot be filled', async () => {
        const seller = await registerUser({ role: 'seller' });
        const plenty = await createProduct(seller.user._id, { countInStock: 5 });
        const scarce = await createProduct(seller.user._id, { countInStock: 1 });
        const alice = await registerUser({});
        const bob = await registerUser({});

        // Both orders are placed while stock is still available to both.
        const bobOrder = await createOrder(bob.token, [
            { product: plenty._id, qty: 2 },
            { product: scarce._id, qty: 1 }
        ]);
        const aliceOrder = await createOrder(alice.token, [{ product: scarce._id, qty: 1 }]);

        // Alice takes the scarce one first, so Bob's order can only partly fill.
        await startCheckout(alice.token, aliceOrder.body._id);
        const res = await startCheckout(bob.token, bobOrder.body._id);

        expect(res.status).toBe(400);
        // The in-stock line must be handed back, not left stranded.
        expect(await stockOf(plenty._id)).toBe(5);
    });

    it('refuses checkout on a cancelled order', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 1 }]);

        await request(app).put(`/api/orders/${order.body._id}/cancel`).set(authHeader(buyer.token)).send({});
        const res = await startCheckout(buyer.token, order.body._id);

        expect(res.status).toBe(400);
    });

    it('will not let one buyer pay for another buyer\'s order', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const buyer = await registerUser({});
        const stranger = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 1 }]);

        const res = await startCheckout(stranger.token, order.body._id);

        expect(res.status).toBe(401);
    });
});

describe('payment webhook', () => {
    it('rejects a payload that is not signed by Stripe', async () => {
        const res = await request(app)
            .post('/api/orders/webhook')
            .set('stripe-signature', 'obviously-fake')
            .set('Content-Type', 'application/json')
            .send(JSON.stringify({ type: 'checkout.session.completed', data: { object: {} } }));

        expect(res.status).toBe(400);
    });

    it('marks the order paid without decrementing stock a second time', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 5 });
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 2 }]);
        await startCheckout(buyer.token, order.body._id);

        await payViaWebhook(order.body._id);

        const saved = await Order.findById(order.body._id);
        expect(saved.isPaid).toBe(true);
        // Reserved at checkout, so payment must not take another 2.
        expect(await stockOf(product._id)).toBe(3);
    });

    it('releases the stock when an abandoned session expires', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 3 });
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 1 }]);
        await startCheckout(buyer.token, order.body._id);
        expect(await stockOf(product._id)).toBe(2);

        await sendWebhook('checkout.session.expired', {
            id: 'cs_expired',
            object: 'checkout.session',
            metadata: { orderId: String(order.body._id) }
        });

        expect(await stockOf(product._id)).toBe(3);
    });

    it('does not inflate stock if the expiry event is replayed', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 3 });
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 1 }]);
        await startCheckout(buyer.token, order.body._id);

        const expiry = {
            id: 'cs_expired',
            object: 'checkout.session',
            metadata: { orderId: String(order.body._id) }
        };
        await sendWebhook('checkout.session.expired', expiry);
        await sendWebhook('checkout.session.expired', expiry);

        expect(await stockOf(product._id)).toBe(3);
    });

    it('refunds a payment that lands on an order cancelled in the meantime', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 1 }]);
        await startCheckout(buyer.token, order.body._id);
        await request(app).put(`/api/orders/${order.body._id}/cancel`).set(authHeader(buyer.token)).send({});

        // The buyer had the Stripe page open and paid anyway.
        await payViaWebhook(order.body._id, 'pi_race_condition');

        const saved = await Order.findById(order.body._id);
        expect(saved.isPaid).toBe(false);
        expect(saved.refundResult.id).toBeTruthy();
        expect(stripe.__getRefund('pi_race_condition')).toBeTruthy();
    });

    it('does not refund twice when that event is replayed', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 1 }]);
        await startCheckout(buyer.token, order.body._id);
        await request(app).put(`/api/orders/${order.body._id}/cancel`).set(authHeader(buyer.token)).send({});

        await payViaWebhook(order.body._id, 'pi_race_condition');
        await payViaWebhook(order.body._id, 'pi_race_condition');

        expect(stripe.__countRefunds()).toBe(1);
    });
});

describe('cancelling an order', () => {
    it('lets the buyer cancel an unpaid order', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 1 }]);

        const res = await request(app)
            .put(`/api/orders/${order.body._id}/cancel`)
            .set(authHeader(buyer.token))
            .send({ reason: 'Changed my mind' });

        expect(res.status).toBe(200);
        expect(res.body.isCancelled).toBe(true);
        expect(res.body.cancelReason).toBe('Changed my mind');
        expect(res.body.refundResult).toBeUndefined();
    });

    it('hands back stock that was reserved but never paid for', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 4 });
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 2 }]);
        await startCheckout(buyer.token, order.body._id);
        expect(await stockOf(product._id)).toBe(2);

        await request(app).put(`/api/orders/${order.body._id}/cancel`).set(authHeader(buyer.token)).send({});

        expect(await stockOf(product._id)).toBe(4);
    });

    it('voids the open Stripe session so it can no longer be paid', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 1 }]);
        await startCheckout(buyer.token, order.body._id);
        const sessionId = (await Order.findById(order.body._id)).checkoutSessionId;

        await request(app).put(`/api/orders/${order.body._id}/cancel`).set(authHeader(buyer.token)).send({});

        expect(stripe.__getSession(sessionId).status).toBe('expired');
    });

    it('refunds and restocks a paid order', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 4 });
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 2 }]);
        await startCheckout(buyer.token, order.body._id);
        await payViaWebhook(order.body._id, 'pi_to_refund');

        const res = await request(app)
            .put(`/api/orders/${order.body._id}/cancel`)
            .set(authHeader(buyer.token))
            .send({ reason: 'Wrong switches' });

        expect(res.status).toBe(200);
        expect(res.body.refundResult.status).toBe('succeeded');
        expect(await stockOf(product._id)).toBe(4);
    });

    it('refuses to cancel twice', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 1 }]);

        await request(app).put(`/api/orders/${order.body._id}/cancel`).set(authHeader(buyer.token)).send({});
        const res = await request(app)
            .put(`/api/orders/${order.body._id}/cancel`)
            .set(authHeader(buyer.token))
            .send({});

        expect(res.status).toBe(400);
    });

    it('refuses to cancel once an item has shipped', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 1 }]);
        await startCheckout(buyer.token, order.body._id);
        await payViaWebhook(order.body._id);
        await request(app).put(`/api/orders/${order.body._id}/deliver`).set(authHeader(seller.token));

        const res = await request(app)
            .put(`/api/orders/${order.body._id}/cancel`)
            .set(authHeader(buyer.token))
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/shipped/i);
    });

    it('will not let a stranger cancel someone else\'s order', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const buyer = await registerUser({});
        const stranger = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 1 }]);

        const res = await request(app)
            .put(`/api/orders/${order.body._id}/cancel`)
            .set(authHeader(stranger.token))
            .send({});

        expect(res.status).toBe(401);
    });
});

describe('per-seller delivery', () => {
    /** An order spanning two sellers, paid and ready to ship. */
    const twoSellerOrder = async () => {
        const sellerA = await registerUser({ role: 'seller' });
        const sellerB = await registerUser({ role: 'seller' });
        const productA = await createProduct(sellerA.user._id, { name: 'From A' });
        const productB = await createProduct(sellerB.user._id, { name: 'From B' });
        const buyer = await registerUser({});

        const order = await createOrder(buyer.token, [
            { product: productA._id, qty: 1 },
            { product: productB._id, qty: 1 }
        ]);
        await startCheckout(buyer.token, order.body._id);
        await payViaWebhook(order.body._id);

        return { sellerA, sellerB, productA, productB, buyer, orderId: order.body._id };
    };

    it('marks only the acting seller\'s own items', async () => {
        const { sellerA, productA, productB, orderId } = await twoSellerOrder();

        await request(app).put(`/api/orders/${orderId}/deliver`).set(authHeader(sellerA.token));

        const saved = await Order.findById(orderId);
        const itemA = saved.orderItems.find((i) => String(i.product) === String(productA._id));
        const itemB = saved.orderItems.find((i) => String(i.product) === String(productB._id));

        expect(itemA.isDelivered).toBe(true);
        expect(itemB.isDelivered).toBe(false);
    });

    it('leaves the order itself undelivered while another seller is outstanding', async () => {
        const { sellerA, orderId } = await twoSellerOrder();

        await request(app).put(`/api/orders/${orderId}/deliver`).set(authHeader(sellerA.token));

        expect((await Order.findById(orderId)).isDelivered).toBe(false);
    });

    it('flips the order to delivered once every seller has shipped', async () => {
        const { sellerA, sellerB, orderId } = await twoSellerOrder();

        await request(app).put(`/api/orders/${orderId}/deliver`).set(authHeader(sellerA.token));
        await request(app).put(`/api/orders/${orderId}/deliver`).set(authHeader(sellerB.token));

        const saved = await Order.findById(orderId);
        expect(saved.isDelivered).toBe(true);
        expect(saved.deliveredAt).toBeTruthy();
    });

    it('reports each seller only their own fulfilment state', async () => {
        const { sellerA, sellerB, orderId } = await twoSellerOrder();
        await request(app).put(`/api/orders/${orderId}/deliver`).set(authHeader(sellerA.token));

        const aView = await request(app).get('/api/orders/sellerorders').set(authHeader(sellerA.token));
        const bView = await request(app).get('/api/orders/sellerorders').set(authHeader(sellerB.token));

        expect(aView.body.orders[0].sellerDelivered).toBe(true);
        expect(bView.body.orders[0].sellerDelivered).toBe(false);
        // Each seller sees only their own line.
        expect(aView.body.orders[0].orderItems).toHaveLength(1);
        expect(bView.body.orders[0].orderItems).toHaveLength(1);
    });

    it('refuses a second delivery of the same seller\'s items', async () => {
        const { sellerA, orderId } = await twoSellerOrder();
        await request(app).put(`/api/orders/${orderId}/deliver`).set(authHeader(sellerA.token));

        const res = await request(app).put(`/api/orders/${orderId}/deliver`).set(authHeader(sellerA.token));

        expect(res.status).toBe(400);
    });

    it('refuses delivery from a seller with nothing in the order', async () => {
        const { orderId } = await twoSellerOrder();
        const outsider = await registerUser({ role: 'seller' });

        const res = await request(app).put(`/api/orders/${orderId}/deliver`).set(authHeader(outsider.token));

        expect(res.status).toBe(401);
    });

    it('refuses delivery before the order is paid', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const buyer = await registerUser({});
        const order = await createOrder(buyer.token, [{ product: product._id, qty: 1 }]);

        const res = await request(app).put(`/api/orders/${order.body._id}/deliver`).set(authHeader(seller.token));

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/paid/i);
    });

    it('refuses delivery from a plain buyer', async () => {
        const { buyer, orderId } = await twoSellerOrder();

        const res = await request(app).put(`/api/orders/${orderId}/deliver`).set(authHeader(buyer.token));

        expect(res.status).toBe(403);
    });
});

describe('paying twice for one order', () => {
    /**
     * The exact sequence that produced a real double charge: pay, have the
     * webhook not arrive, then click Pay again. `order.isPaid` is only ever
     * set by the webhook, so it still reads false — and the old session
     * cannot be voided to compensate, because Stripe refuses to expire a
     * session that is already complete.
     */
    const payAtStripeWithoutWebhook = async (token, orderId) => {
        const res = await startCheckout(token, orderId);
        const sessionId = (await Order.findById(orderId)).checkoutSessionId;
        stripe.__markSessionComplete(sessionId);
        return { res, sessionId };
    };

    it('refuses a second checkout when the first session was already paid', async () => {
        const seller = await registerUser({ email: 'seller-twice@example.com', role: 'seller' });
        const { token } = await registerUser({ email: 'twice@example.com' });
        const product = await createProduct(seller.user._id, { countInStock: 5, price: 10 });
        const order = (await createOrder(token, [{ product: product._id, qty: 1 }])).body;

        await payAtStripeWithoutWebhook(token, order._id);

        const second = await startCheckout(token, order._id);

        expect(second.status).toBe(400);
        expect(second.body.message).toMatch(/already paid/i);
    });

    it('settles the order from Stripe rather than waiting on the webhook', async () => {
        const seller = await registerUser({ email: 'seller-settle@example.com', role: 'seller' });
        const { token } = await registerUser({ email: 'settle@example.com' });
        const product = await createProduct(seller.user._id, { countInStock: 5, price: 10 });
        const order = (await createOrder(token, [{ product: product._id, qty: 1 }])).body;

        await payAtStripeWithoutWebhook(token, order._id);
        expect((await Order.findById(order._id)).isPaid).toBe(false);

        await startCheckout(token, order._id);

        const settled = await Order.findById(order._id);
        expect(settled.isPaid).toBe(true);
        expect(settled.paidAt).toBeTruthy();
        expect(settled.paymentResult.id).toBeTruthy();
    });

    it('does not mint a second Stripe session', async () => {
        const seller = await registerUser({ email: 'seller-nosecond@example.com', role: 'seller' });
        const { token } = await registerUser({ email: 'nosecond@example.com' });
        const product = await createProduct(seller.user._id, { countInStock: 5, price: 10 });
        const order = (await createOrder(token, [{ product: product._id, qty: 1 }])).body;

        const { sessionId } = await payAtStripeWithoutWebhook(token, order._id);

        await startCheckout(token, order._id);

        // Same session id means no second payment page was ever created, so
        // there was nothing for the buyer to pay into a second time.
        expect((await Order.findById(order._id)).checkoutSessionId).toBe(sessionId);
    });

    it('takes stock only once across the whole sequence', async () => {
        const seller = await registerUser({ email: 'seller-stockonce@example.com', role: 'seller' });
        const { token } = await registerUser({ email: 'stockonce@example.com' });
        const product = await createProduct(seller.user._id, { countInStock: 5, price: 10 });
        const order = (await createOrder(token, [{ product: product._id, qty: 2 }])).body;

        await payAtStripeWithoutWebhook(token, order._id);
        await startCheckout(token, order._id);

        expect(await stockOf(product._id)).toBe(3);
    });

    it('still allows re-checkout when the first session went unpaid', async () => {
        // Abandoning a checkout must not lock the buyer out of paying later.
        const seller = await registerUser({ email: 'seller-retry@example.com', role: 'seller' });
        const { token } = await registerUser({ email: 'retry@example.com' });
        const product = await createProduct(seller.user._id, { countInStock: 5, price: 10 });
        const order = (await createOrder(token, [{ product: product._id, qty: 1 }])).body;

        const first = await startCheckout(token, order._id);
        const firstSession = (await Order.findById(order._id)).checkoutSessionId;

        const second = await startCheckout(token, order._id);

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect((await Order.findById(order._id)).checkoutSessionId).not.toBe(firstSession);
    });
});
