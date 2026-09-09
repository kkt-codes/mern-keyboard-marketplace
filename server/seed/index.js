/**
 * Populates the database with a browsable demo store.
 *
 *   npm run seed            wipe users/products/orders, then insert the demo set
 *   npm run seed:destroy    wipe only, leaving an empty database
 *
 * The point is that someone cloning this repository gets a store worth looking
 * at on the first run — products with real photographs, reviews, and orders in
 * every state the dashboards branch on — instead of empty tables and a sign-up
 * form.
 *
 * This is destructive by design: it deletes every user, product and order in
 * the target database before inserting. It refuses to run against
 * NODE_ENV=production without --force, because it also creates accounts whose
 * passwords are published in the README.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { DEMO_PASSWORD, users, products, reviews, orders } = require('./data');

const args = process.argv.slice(2);
const destroyOnly = args.includes('--destroy') || args.includes('-d');
const force = args.includes('--force');

const round2 = (n) => Math.round(n * 100) / 100;
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

/**
 * Builds an order document from a fixture.
 *
 * Line items are snapshotted from the product the same way a real checkout
 * does — name, image and price are copied, not referenced — and the totals use
 * the same rules as addOrderItems in the order controller. Duplicating the
 * numbers by hand would let the fixtures drift silently the first time the tax
 * rate or the free-shipping threshold changes.
 */
const buildOrder = (fixture, userIds, productsByKey) => {
    const orderItems = fixture.items.map(({ productKey, qty, delivered }) => {
        const product = productsByKey[productKey];
        return {
            name: product.name,
            qty,
            image: product.image,
            price: product.price,
            product: product._id,
            isDelivered: delivered,
            deliveredAt: delivered ? daysAgo(fixture.daysAgo - 3) : undefined
        };
    });

    const itemsPrice = round2(orderItems.reduce((sum, i) => sum + i.price * i.qty, 0));
    const shippingPrice = itemsPrice > 100 ? 0 : 10;
    const taxPrice = round2(itemsPrice * 0.15);
    const totalPrice = round2(itemsPrice + shippingPrice + taxPrice);

    const createdAt = daysAgo(fixture.daysAgo);
    const allDelivered = orderItems.every((i) => i.isDelivered);

    const order = {
        user: userIds[fixture.buyerKey],
        orderItems,
        shippingAddress: fixture.shippingAddress,
        paymentMethod: 'Stripe',
        taxPrice,
        shippingPrice,
        totalPrice,
        isPaid: fixture.isPaid,
        stockReserved: fixture.stockReserved,
        isDelivered: allDelivered,
        deliveredAt: allDelivered ? daysAgo(fixture.daysAgo - 3) : undefined,
        createdAt,
        updatedAt: createdAt
    };

    if (fixture.isPaid) {
        order.paidAt = daysAgo(fixture.daysAgo);
        // Placeholder identifiers, not real Stripe objects — see the README
        // note about cancelling a seeded paid order.
        order.paymentResult = {
            id: `pi_demo_${Math.random().toString(36).slice(2, 14)}`,
            status: 'succeeded',
            update_time: order.paidAt.toISOString(),
            email_address: users.find((u) => u.key === fixture.buyerKey).email
        };
    }

    if (fixture.cancelled) {
        order.isCancelled = true;
        order.cancelledAt = daysAgo(fixture.daysAgo - 1);
        order.cancelReason = fixture.cancelReason;
    }

    if (fixture.refunded) {
        order.refunds = [
            {
                id: `re_demo_${Math.random().toString(36).slice(2, 14)}`,
                amount: totalPrice,
                status: 'succeeded',
                createdAt: order.cancelledAt
            }
        ];
    }

    return order;
};

const wipe = async () => {
    const [o, p, u] = await Promise.all([
        Order.deleteMany({}),
        Product.deleteMany({}),
        User.deleteMany({})
    ]);
    console.log(
        `  removed ${u.deletedCount} users, ${p.deletedCount} products, ${o.deletedCount} orders`
    );
};

const seed = async () => {
    await wipe();

    // create() rather than insertMany(): only create() runs the schema's
    // pre-save hook, and that hook is what hashes the password. insertMany
    // would store all seven passwords in plain text.
    const created = await User.create(
        users.map(({ key, bookmarkKeys, ...rest }) => ({ ...rest, password: DEMO_PASSWORD }))
    );
    const userIds = Object.fromEntries(users.map((u, i) => [u.key, created[i]._id]));
    console.log(`  created ${created.length} users`);

    const reviewsByProduct = reviews.reduce((acc, r) => {
        (acc[r.productKey] ||= []).push({
            user: userIds[r.userKey],
            name: users.find((u) => u.key === r.userKey).name,
            rating: r.rating,
            comment: r.comment
        });
        return acc;
    }, {});

    const createdProducts = await Product.insertMany(
        products.map(({ key, sellerKey, listedDaysAgo, ...rest }) => {
            const listedAt = daysAgo(listedDaysAgo);

            // Reviews need their dates set by hand. The `timestamps: false`
            // below is what keeps the staggered listedAt from being clobbered,
            // but the option cascades into embedded subdocuments — so the
            // review schema's own `timestamps: true` stops firing and every
            // review lands without a createdAt. ProductScreen renders that
            // date unconditionally, so a missing one takes down the whole
            // product page.
            //
            // Spacing them between the listing date and now keeps the obvious
            // invariant true: nobody reviews a product before it was listed.
            const productReviews = (reviewsByProduct[key] || []).map((review, i, all) => {
                const reviewedAt = daysAgo(Math.round((listedDaysAgo * (all.length - i)) / (all.length + 1)));
                return { ...review, createdAt: reviewedAt, updatedAt: reviewedAt };
            });
            return {
                ...rest,
                user: userIds[sellerKey],
                createdAt: listedAt,
                updatedAt: listedAt,
                reviews: productReviews,
                numReviews: productReviews.length,
                // Same unrounded mean the review endpoint stores, so a seeded
                // rating matches what posting those reviews would produce.
                rating: productReviews.length
                    ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
                    : 0
            };
        }),
        // Without this, the timestamps plugin stamps every document with "now"
        // and discards the staggered createdAt above — leaving the Newest sort
        // and the homepage's latest-arrivals row in arbitrary order.
        { timestamps: false }
    );
    const productsByKey = Object.fromEntries(
        products.map((p, i) => [p.key, createdProducts[i]])
    );
    console.log(`  created ${createdProducts.length} products with ${reviews.length} reviews`);

    await Promise.all(
        users
            .filter((u) => u.bookmarkKeys?.length)
            .map((u) =>
                User.findByIdAndUpdate(userIds[u.key], {
                    bookmarks: u.bookmarkKeys.map((k) => productsByKey[k]._id)
                })
            )
    );

    const createdOrders = await Order.insertMany(
        orders.map((o) => buildOrder(o, userIds, productsByKey)),
        { timestamps: false } // buildOrder backdates createdAt itself
    );
    console.log(`  created ${createdOrders.length} orders`);
};

const main = async () => {
    if (process.env.NODE_ENV === 'production' && !force) {
        console.error(
            'Refusing to run against NODE_ENV=production.\n' +
                'This wipes every user, product and order, and creates accounts whose\n' +
                'passwords are published in the README. Pass --force if you are certain.'
        );
        process.exit(1);
    }

    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set. Copy server/.env.example to server/.env first.');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected to ${mongoose.connection.name}`);

    if (destroyOnly) {
        console.log('Destroying data...');
        await wipe();
        console.log('Done. Database is empty.');
    } else {
        console.log('Seeding...');
        await seed();
        console.log(`\nDone. Every account uses the password: ${DEMO_PASSWORD}`);
        console.log('  admin@example.com    admin');
        console.log('  nova@example.com     seller');
        console.log('  kofi@example.com     buyer');
    }

    await mongoose.disconnect();
};

main().catch(async (error) => {
    console.error(`\nSeed failed: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
