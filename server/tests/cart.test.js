const { request, app, registerUser, createProduct, authHeader } = require('./helpers');
const Product = require('./../models/Product');

const getCart = (token) => request(app).get('/api/cart').set(authHeader(token));

const putCart = (token, items) =>
    request(app).put('/api/cart').set(authHeader(token)).send({ items });

const mergeCart = (token, items) =>
    request(app).post('/api/cart/merge').set(authHeader(token)).send({ items });

describe('the saved cart', () => {
    it('starts empty for a new account', async () => {
        const { token } = await registerUser({});

        const res = await getCart(token);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('survives between requests', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const { token } = await registerUser({});

        await putCart(token, [{ product: product._id, qty: 3 }]);
        const res = await getCart(token);

        expect(res.body).toHaveLength(1);
        expect(res.body[0].qty).toBe(3);
    });

    it('returns live product data rather than whatever was stored', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { price: 80, name: 'Original Name' });
        const { token } = await registerUser({});
        await putCart(token, [{ product: product._id, qty: 1 }]);

        // The seller re-prices and renames after the cart was saved.
        await Product.findByIdAndUpdate(product._id, { price: 95, name: 'Renamed Board' });
        const res = await getCart(token);

        expect(res.body[0].price).toBe(95);
        expect(res.body[0].name).toBe('Renamed Board');
    });

    it('ignores a price or name supplied by the client', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { price: 120, name: 'Real Board' });
        const { token } = await registerUser({});

        const res = await putCart(token, [
            { product: product._id, qty: 1, price: 0.01, name: 'hacked' }
        ]);

        expect(res.body[0].price).toBe(120);
        expect(res.body[0].name).toBe('Real Board');
    });

    it('is private to its owner', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const alice = await registerUser({});
        const bob = await registerUser({});

        await putCart(alice.token, [{ product: product._id, qty: 2 }]);
        const res = await getCart(bob.token);

        expect(res.body).toEqual([]);
    });

    it('requires signing in', async () => {
        const res = await request(app).get('/api/cart');
        expect(res.status).toBe(401);
    });

    it('collapses duplicate lines for the same product', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 10 });
        const { token } = await registerUser({});

        const res = await putCart(token, [
            { product: product._id, qty: 1 },
            { product: product._id, qty: 2 }
        ]);

        expect(res.body).toHaveLength(1);
        expect(res.body[0].qty).toBe(3);
    });

    it('drops zero, negative and malformed lines', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const { token } = await registerUser({});

        const res = await putCart(token, [
            { product: product._id, qty: 0 },
            { product: product._id, qty: -5 },
            { qty: 2 },
            { product: product._id }
        ]);

        expect(res.body).toEqual([]);
    });

    it('can be emptied', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const { token } = await registerUser({});
        await putCart(token, [{ product: product._id, qty: 1 }]);

        const res = await putCart(token, []);

        expect(res.body).toEqual([]);
    });
});

describe('reconciling a stale cart', () => {
    it('drops a line whose product has been deleted', async () => {
        const seller = await registerUser({ role: 'seller' });
        const staying = await createProduct(seller.user._id);
        const going = await createProduct(seller.user._id);
        const { token } = await registerUser({});
        await putCart(token, [
            { product: staying._id, qty: 1 },
            { product: going._id, qty: 1 }
        ]);

        await Product.findByIdAndDelete(going._id);
        const res = await getCart(token);

        expect(res.body).toHaveLength(1);
        expect(res.body[0]._id).toBe(String(staying._id));
    });

    it('caps a quantity that now exceeds available stock', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 10 });
        const { token } = await registerUser({});
        await putCart(token, [{ product: product._id, qty: 8 }]);

        await Product.findByIdAndUpdate(product._id, { countInStock: 3 });
        const res = await getCart(token);

        expect(res.body[0].qty).toBe(3);
    });

    it('drops a line that has sold out entirely', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 5 });
        const { token } = await registerUser({});
        await putCart(token, [{ product: product._id, qty: 2 }]);

        await Product.findByIdAndUpdate(product._id, { countInStock: 0 });
        const res = await getCart(token);

        expect(res.body).toEqual([]);
    });
});

describe('merging a guest cart on sign-in', () => {
    it('adds guest quantities to what was already saved', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 20 });
        const { token } = await registerUser({});
        await putCart(token, [{ product: product._id, qty: 3 }]);

        const res = await mergeCart(token, [{ product: product._id, qty: 2 }]);

        expect(res.body[0].qty).toBe(5);
    });

    it('brings across products the saved cart did not have', async () => {
        const seller = await registerUser({ role: 'seller' });
        const saved = await createProduct(seller.user._id);
        const guestOnly = await createProduct(seller.user._id);
        const { token } = await registerUser({});
        await putCart(token, [{ product: saved._id, qty: 1 }]);

        const res = await mergeCart(token, [{ product: guestOnly._id, qty: 1 }]);

        expect(res.body).toHaveLength(2);
    });

    it('never exceeds available stock, however much the guest added', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 4 });
        const { token } = await registerUser({});
        await putCart(token, [{ product: product._id, qty: 4 }]);

        const res = await mergeCart(token, [{ product: product._id, qty: 99 }]);

        expect(res.body[0].qty).toBe(4);
    });

    it('is a harmless no-op when there is nothing to merge', async () => {
        // Called on every sign-in, including when no guest cart exists.
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id);
        const { token } = await registerUser({});
        await putCart(token, [{ product: product._id, qty: 2 }]);

        const res = await mergeCart(token, []);

        expect(res.body).toHaveLength(1);
        expect(res.body[0].qty).toBe(2);
    });

    it('leaves other accounts untouched', async () => {
        const seller = await registerUser({ role: 'seller' });
        const product = await createProduct(seller.user._id, { countInStock: 20 });
        const alice = await registerUser({});
        const bob = await registerUser({});
        await putCart(bob.token, [{ product: product._id, qty: 1 }]);

        await mergeCart(alice.token, [{ product: product._id, qty: 5 }]);

        const bobCart = await getCart(bob.token);
        expect(bobCart.body[0].qty).toBe(1);
    });
});
