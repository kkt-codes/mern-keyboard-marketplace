const {
    request, app, registerUser, registerAdmin, createProduct, createOrder, authHeader
} = require('./helpers');

describe('user search (admin)', () => {
    const seedUsers = async () => {
        const admin = await registerAdmin({ email: 'admin@example.com' });
        await registerUser({ name: 'Ada Lovelace', email: 'ada@example.com' });
        await registerUser({ name: 'Grace Hopper', email: 'grace@example.com', role: 'seller' });
        return admin;
    };

    it('matches on name', async () => {
        const admin = await seedUsers();

        const res = await request(app).get('/api/users?keyword=Ada').set(authHeader(admin.token));

        expect(res.body.total).toBe(1);
        expect(res.body.users[0].email).toBe('ada@example.com');
    });

    it('matches on an email fragment', async () => {
        const admin = await seedUsers();

        const res = await request(app).get('/api/users?keyword=grace@').set(authHeader(admin.token));

        expect(res.body.total).toBe(1);
    });

    it('is case-insensitive', async () => {
        const admin = await seedUsers();

        const res = await request(app).get('/api/users?keyword=ada+lovelace').set(authHeader(admin.token));

        expect(res.body.total).toBe(1);
    });

    it('filters by role', async () => {
        const admin = await seedUsers();

        const res = await request(app).get('/api/users?role=seller').set(authHeader(admin.token));

        expect(res.body.total).toBe(1);
        expect(res.body.users[0].role).toBe('seller');
    });

    it('treats regex characters as literal text, not a pattern', async () => {
        // A bare `.*` would otherwise match every user.
        const admin = await seedUsers();

        const res = await request(app).get('/api/users?keyword=.*').set(authHeader(admin.token));

        expect(res.body.total).toBe(0);
    });

    it('returns an empty page rather than an error when nothing matches', async () => {
        const admin = await seedUsers();

        const res = await request(app).get('/api/users?keyword=nobodyhere').set(authHeader(admin.token));

        expect(res.status).toBe(200);
        expect(res.body.users).toEqual([]);
    });

    it('is closed to non-admins', async () => {
        await seedUsers();
        const buyer = await registerUser({});

        const res = await request(app).get('/api/users').set(authHeader(buyer.token));

        expect(res.status).toBe(403);
    });
});

describe('order search', () => {
    /** One paid order for Ada, one unpaid for Grace. */
    const seedOrders = async () => {
        const admin = await registerAdmin({ email: 'admin@example.com' });
        const seller = await registerUser({ role: 'seller' });
        const widget = await createProduct(seller.user._id, { name: 'Widget Board', countInStock: 20 });
        const gadget = await createProduct(seller.user._id, { name: 'Gadget Board', countInStock: 20 });

        const ada = await registerUser({ name: 'Ada Lovelace', email: 'ada@example.com' });
        const grace = await registerUser({ name: 'Grace Hopper', email: 'grace@example.com' });

        await createOrder(ada.token, [{ product: widget._id, qty: 1 }]);
        await createOrder(grace.token, [{ product: gadget._id, qty: 1 }]);

        return { admin, ada, grace };
    };

    it('finds an admin\'s view of orders by buyer name', async () => {
        const { admin } = await seedOrders();

        const res = await request(app).get('/api/orders?keyword=Ada').set(authHeader(admin.token));

        expect(res.body.total).toBe(1);
        expect(res.body.orders[0].user.email).toBe('ada@example.com');
    });

    it('finds them by buyer email too', async () => {
        const { admin } = await seedOrders();

        const res = await request(app).get('/api/orders?keyword=grace@example').set(authHeader(admin.token));

        expect(res.body.total).toBe(1);
    });

    it('filters by status', async () => {
        const { admin } = await seedOrders();

        const unpaid = await request(app).get('/api/orders?status=unpaid').set(authHeader(admin.token));
        const paid = await request(app).get('/api/orders?status=paid').set(authHeader(admin.token));

        expect(unpaid.body.total).toBe(2);
        expect(paid.body.total).toBe(0);
    });

    it('lets a buyer search their own orders by product name', async () => {
        const { ada } = await seedOrders();

        const res = await request(app).get('/api/orders/myorders?keyword=Widget').set(authHeader(ada.token));

        expect(res.body.total).toBe(1);
    });

    it('never surfaces another buyer\'s order through that search', async () => {
        const { grace } = await seedOrders();

        // "Widget Board" belongs to Ada's order, not Grace's.
        const res = await request(app).get('/api/orders/myorders?keyword=Widget').set(authHeader(grace.token));

        expect(res.body.total).toBe(0);
    });

    it('filters a buyer\'s own orders by status', async () => {
        const { ada } = await seedOrders();

        const unpaid = await request(app).get('/api/orders/myorders?status=unpaid').set(authHeader(ada.token));
        const delivered = await request(app).get('/api/orders/myorders?status=delivered').set(authHeader(ada.token));

        expect(unpaid.body.total).toBe(1);
        expect(delivered.body.total).toBe(0);
    });
});

describe('seller product search', () => {
    const seedProducts = async () => {
        const seller = await registerUser({ role: 'seller' });
        await createProduct(seller.user._id, { name: 'Zephyr Board', countInStock: 3 });
        await createProduct(seller.user._id, { name: 'Scarce Board', countInStock: 2 });
        await createProduct(seller.user._id, { name: 'Plenty Board', countInStock: 50 });
        return seller;
    };

    it('matches on a partial name', async () => {
        const seller = await seedProducts();

        const res = await request(app)
            .get('/api/products/myproducts?keyword=Zephyr')
            .set(authHeader(seller.token));

        expect(res.body.total).toBe(1);
    });

    it('shows only low stock when asked', async () => {
        const seller = await seedProducts();

        const res = await request(app)
            .get('/api/products/myproducts?lowStock=true')
            .set(authHeader(seller.token));

        const names = res.body.products.map((p) => p.name);
        expect(names).toContain('Zephyr Board');
        expect(names).toContain('Scarce Board');
        expect(names).not.toContain('Plenty Board');
    });

    it('combines keyword and low stock as an AND', async () => {
        const seller = await seedProducts();

        const res = await request(app)
            .get('/api/products/myproducts?keyword=Board&lowStock=true')
            .set(authHeader(seller.token));

        expect(res.body.total).toBe(2);
    });

    it('shows a seller only their own listings', async () => {
        const seller = await seedProducts();
        const other = await registerUser({ role: 'seller' });
        await createProduct(other.user._id, { name: 'Someone Elses Board' });

        const res = await request(app).get('/api/products/myproducts').set(authHeader(seller.token));

        expect(res.body.total).toBe(3);
    });
});

describe('the public product catalogue', () => {
    const seedCatalogue = async () => {
        const seller = await registerUser({ role: 'seller' });
        await createProduct(seller.user._id, { name: 'Alpha Board', price: 50, category: 'Mechanical' });
        await createProduct(seller.user._id, { name: 'Beta Board', price: 150, category: 'Wireless' });
        await createProduct(seller.user._id, { name: 'Gamma Board', price: 250, category: 'Mechanical' });
        return seller;
    };

    it('is readable without signing in', async () => {
        await seedCatalogue();

        const res = await request(app).get('/api/products');

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(3);
    });

    it('filters by category', async () => {
        await seedCatalogue();

        const res = await request(app).get('/api/products?category=Mechanical');

        expect(res.body.total).toBe(2);
    });

    it('filters by price range', async () => {
        await seedCatalogue();

        const res = await request(app).get('/api/products?minPrice=100&maxPrice=200');

        expect(res.body.total).toBe(1);
        expect(res.body.products[0].name).toBe('Beta Board');
    });

    it('sorts by price', async () => {
        await seedCatalogue();

        const res = await request(app).get('/api/products?sort=price_asc');

        expect(res.body.products.map((p) => p.price)).toEqual([50, 150, 250]);
    });

    it('paginates', async () => {
        await seedCatalogue();

        const res = await request(app).get('/api/products?limit=2&page=2');

        expect(res.body.products).toHaveLength(1);
        expect(res.body.pages).toBe(2);
        expect(res.body.total).toBe(3);
    });
});

describe('malformed resource ids', () => {
    it('answers 404 for an order id that is not an ObjectId', async () => {
        const { token } = await registerUser({});

        const res = await request(app).get('/api/orders/not-an-object-id').set(authHeader(token));

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Resource not found');
    });

    it('answers 404 for a bad product id', async () => {
        const res = await request(app).get('/api/products/not-an-object-id');
        expect(res.status).toBe(404);
    });

    it('answers 404 when an admin uses a bad user id', async () => {
        const admin = await registerAdmin({ email: 'admin@example.com' });

        const res = await request(app)
            .put('/api/users/not-an-object-id/role')
            .set(authHeader(admin.token))
            .send({ role: 'seller' });

        expect(res.status).toBe(404);
    });

    it('still answers 404 for a well-formed id that does not exist', async () => {
        const { token } = await registerUser({});

        const res = await request(app)
            .get('/api/orders/000000000000000000000000')
            .set(authHeader(token));

        expect(res.status).toBe(404);
    });
});
