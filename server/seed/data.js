/**
 * Demo fixtures for `npm run seed`.
 *
 * Kept separate from the runner so the shape of the demo store is editable
 * without touching the wipe/insert logic. Everything here is referenced by
 * the string keys below (`sellerKey`, `productKey`, `buyerKey`) rather than
 * by ObjectId, because the ids don't exist until insert time.
 *
 * Every image is a photograph of the keyboard the product claims to be —
 * see client/public/images/products/CREDITS.md for sources and licences.
 */

/** One shared password for every demo account. Documented in the README. */
const DEMO_PASSWORD = 'password123';

const users = [
    {
        key: 'admin',
        name: 'Ada Mensah',
        email: 'admin@example.com',
        role: 'admin'
    },
    {
        key: 'nova',
        name: 'Nova Switch Co.',
        email: 'nova@example.com',
        role: 'seller'
    },
    {
        key: 'artisan',
        name: 'Artisan Bench',
        email: 'artisan@example.com',
        role: 'seller'
    },
    {
        key: 'depot',
        name: 'Peripheral Depot',
        email: 'depot@example.com',
        role: 'seller'
    },
    // Buyers carry a few bookmarks so the dashboard's Bookmarks tab has
    // something in it without the visitor having to go and save items first.
    {
        key: 'kofi',
        name: 'Kofi Boateng',
        email: 'kofi@example.com',
        role: 'buyer',
        bookmarkKeys: ['hhkb', 'aviator', 'apex5']
    },
    {
        key: 'lena',
        name: 'Lena Ortiz',
        email: 'lena@example.com',
        role: 'buyer',
        bookmarkKeys: ['mintcoral', 'k8']
    },
    {
        key: 'sam',
        name: 'Sam Whitfield',
        email: 'sam@example.com',
        role: 'buyer',
        bookmarkKeys: ['pastel96']
    }
];

/**
 * Stock levels are deliberately uneven: a couple sit under the dashboard's
 * low-stock threshold of 5 and one is at zero, so the seller's "Low stock
 * only" filter and the out-of-stock UI both have something to show.
 */
const products = [
    // ---- Nova Switch Co. — mainstream mechanical boards ----
    {
        key: 'k8',
        listedDaysAgo: 9,
        sellerKey: 'nova',
        name: 'Keychron K8 Wireless Mechanical',
        brand: 'Keychron',
        category: 'Mechanical',
        image: '/images/products/keychron-k8.jpg',
        price: 89.99,
        countInStock: 14,
        description:
            'Tenkeyless 87-key layout with hot-swappable Gateron switches and a ' +
            'doubleshot PBT keycap set. Pairs with three devices over Bluetooth 5.1 ' +
            'or runs wired over USB-C, and the aluminium frame keeps flex to nothing.'
    },
    {
        key: 'k4',
        listedDaysAgo: 27,
        sellerKey: 'nova',
        name: 'Keychron K4 96% Mechanical',
        brand: 'Keychron',
        category: 'Mechanical',
        image: '/images/products/keychron-k4.jpg',
        price: 79.99,
        countInStock: 9,
        description:
            'A 96% board that keeps the number pad without the wasted desk space of ' +
            'a full-size. RGB backlighting, Gateron Brown switches, and a 4000mAh ' +
            'battery that comfortably clears a working week between charges.'
    },
    {
        key: 'hhkb',
        listedDaysAgo: 40,
        sellerKey: 'nova',
        name: 'HHKB Professional 2',
        brand: 'PFU',
        category: 'Compact',
        image: '/images/products/hhkb-professional-2.jpg',
        price: 239.0,
        countInStock: 4,
        description:
            'The 60-key cult classic. Topre electrostatic capacitive switches give a ' +
            'uniquely smooth press that no mechanical switch quite copies, and the ' +
            'Control-where-Caps-should-be layout is why so many developers swear by it.'
    },
    {
        key: 'magicforce',
        listedDaysAgo: 63,
        sellerKey: 'nova',
        name: 'Qisan Magicforce 68',
        brand: 'Qisan',
        category: 'Compact',
        image: '/images/products/qisan-magicforce-68.jpg',
        price: 54.99,
        countInStock: 22,
        description:
            'A 68-key board that keeps dedicated arrow keys, which most 60% layouts ' +
            'give up. White LED backlighting, a slim aluminium top plate, and a ' +
            'detachable mini-USB cable. The usual first mechanical keyboard.'
    },
    {
        key: 'lingbao',
        listedDaysAgo: 81,
        sellerKey: 'nova',
        name: 'Lingbao JIGUANSHI RGB Gaming',
        brand: 'Lingbao',
        category: 'Gaming',
        image: '/images/products/lingbao-jiguanshi-rgb.jpg',
        price: 69.5,
        countInStock: 0,
        description:
            'Per-key RGB across a tenkeyless frame with full N-key rollover and a ' +
            '1000Hz polling rate. Blue switches, so it is loud on purpose — the ' +
            'click is the point. Floating keycaps make the lighting spill nicely.'
    },

    // ---- Artisan Bench — one-off custom builds ----
    {
        key: 'aviator',
        listedDaysAgo: 3,
        sellerKey: 'artisan',
        name: 'Aviator 65% Custom Build',
        brand: 'Artisan Bench',
        category: 'Custom',
        image: '/images/products/custom-aviator-build.jpg',
        price: 329.0,
        countInStock: 2,
        description:
            'Built to order on a brass-weighted 65% case with an aviation-themed ' +
            'dye-sublimated keycap set — GEAR UP, AFTERBURNER, MASTER ARM. Lubed ' +
            'linear switches, tape-modded PCB, and a foam-filled case for a low thock.'
    },
    {
        key: 'mintcoral',
        listedDaysAgo: 13,
        sellerKey: 'artisan',
        name: 'Mint & Coral 65% Custom',
        brand: 'Artisan Bench',
        category: 'Custom',
        image: '/images/products/custom-mint-coral-65.jpg',
        price: 289.0,
        countInStock: 3,
        description:
            'Cherry-profile mint and coral PBT on a polycarbonate case that diffuses ' +
            'the underglow into a soft wash. Gasket mounted, so the whole plate flexes ' +
            'slightly under each press instead of bottoming out hard.'
    },
    {
        key: 'pastel96',
        listedDaysAgo: 22,
        sellerKey: 'artisan',
        name: 'Pastel 96-Key Custom Build',
        brand: 'Artisan Bench',
        category: 'Custom',
        image: '/images/products/custom-pastel-96.jpg',
        price: 349.0,
        countInStock: 1,
        description:
            'A 1800-layout build in a sandblasted grey case, finished with a pastel ' +
            'keycap set that runs lilac through to sky blue. One of a kind — this ' +
            'listing is the actual board in the photograph, not a production run.'
    },
    {
        key: 'roundcap',
        listedDaysAgo: 48,
        sellerKey: 'artisan',
        name: 'Retro Round Keycap TKL',
        brand: 'Artisan Bench',
        category: 'Mechanical',
        image: '/images/products/artisan-round-keycap-tkl.jpg',
        price: 164.0,
        countInStock: 6,
        description:
            'Typewriter-style round keycaps on a modern tenkeyless PCB, with RGB ' +
            'bleeding up around each cap. Divisive to look at and genuinely lovely ' +
            'to type on once your fingers stop expecting square edges.'
    },

    // ---- Peripheral Depot — office and gaming peripherals ----
    {
        key: 'apex5',
        listedDaysAgo: 6,
        sellerKey: 'depot',
        name: 'SteelSeries Apex 5',
        brand: 'SteelSeries',
        category: 'Gaming',
        image: '/images/products/steelseries-apex-5.jpg',
        price: 99.99,
        countInStock: 18,
        description:
            'Hybrid blue switches that snap like a mechanical but register on a ' +
            'membrane, an OLED smart display in the corner, and a magnetic leatherette ' +
            'wrist rest. Aircraft-grade aluminium top so it does not budge mid-match.'
    },
    {
        key: 'corsair',
        listedDaysAgo: 33,
        sellerKey: 'depot',
        name: 'Corsair Gaming RGB Mechanical',
        brand: 'Corsair',
        category: 'Gaming',
        image: '/images/products/corsair-gaming-rgb.jpg',
        price: 129.99,
        countInStock: 7,
        description:
            'Full-size with a dedicated media wheel, per-key RGB, and Cherry MX ' +
            'switches rated to 50 million presses. Onboard profile storage means the ' +
            'lighting and macros follow the board to another machine.'
    },
    {
        key: 'k380',
        listedDaysAgo: 17,
        sellerKey: 'depot',
        name: 'Logitech K380 Multi-Device',
        brand: 'Logitech',
        category: 'Wireless',
        image: '/images/products/logitech-k380.jpg',
        price: 39.99,
        countInStock: 31,
        description:
            'Round-key Bluetooth board that switches between three paired devices at ' +
            'the press of a button — laptop, tablet, phone. Runs two years on a pair ' +
            'of AAAs and weighs little enough to live in a bag.'
    },
    {
        key: 'k810',
        listedDaysAgo: 72,
        sellerKey: 'depot',
        name: 'Logitech K810 Illuminated Bluetooth',
        brand: 'Logitech',
        category: 'Wireless',
        image: '/images/products/logitech-k810.jpg',
        price: 64.99,
        countInStock: 12,
        description:
            'Backlit scissor-switch keys with proximity sensors, so the lighting comes ' +
            'up as your hands approach and dims when they leave. Brushed aluminium ' +
            'body, rechargeable over micro-USB while you keep typing.'
    },
    {
        key: 'magic',
        listedDaysAgo: 55,
        sellerKey: 'depot',
        name: 'Apple Magic Keyboard',
        brand: 'Apple',
        category: 'Wireless',
        image: '/images/products/apple-magic-keyboard.jpg',
        price: 99.0,
        countInStock: 8,
        description:
            'Scissor mechanism with 1mm travel in an anodised aluminium shell that is ' +
            'barely thicker than the keycaps. Pairs instantly with a Mac, and a full ' +
            'charge lasts about a month of normal use.'
    },
    {
        key: 'amazon',
        listedDaysAgo: 95,
        sellerKey: 'depot',
        name: 'Amazon Basics Wireless Keyboard',
        brand: 'Amazon Basics',
        category: 'Wireless',
        image: '/images/products/amazon-basics-wireless.jpg',
        price: 22.99,
        countInStock: 40,
        description:
            'Full-size 2.4GHz membrane board with a number pad and a nano receiver ' +
            'that lives in the USB port. Nothing clever about it — it is quiet, it is ' +
            'cheap, and it works the moment you plug the dongle in.'
    }
];

/**
 * Reviews are spread unevenly on purpose: some products carry several, some
 * one, most none. A store where every item has exactly three reviews reads as
 * obviously fake, and it makes the rating sort meaningless.
 */
const reviews = [
    { productKey: 'k8', userKey: 'kofi', rating: 5, comment: 'Third Keychron I have owned and the best of them. The hot-swap sockets meant I could try three switch types without desoldering anything.' },
    { productKey: 'k8', userKey: 'lena', rating: 4, comment: 'Types beautifully. Bluetooth occasionally takes a second to wake from sleep, which is the only reason this is not five stars.' },
    { productKey: 'k8', userKey: 'sam', rating: 5, comment: 'The PBT caps still look new after eight months of daily use. No shine at all on the WASD cluster.' },
    { productKey: 'hhkb', userKey: 'sam', rating: 5, comment: 'Expensive and worth it. Topre is genuinely different — closer to a very good rubber dome than to any mechanical switch, in the best way.' },
    { productKey: 'hhkb', userKey: 'kofi', rating: 4, comment: 'Took me a fortnight to stop reaching for arrow keys that are not there. Now I miss the layout on every other board.' },
    { productKey: 'apex5', userKey: 'lena', rating: 4, comment: 'The OLED display is more useful than I expected for switching profiles. Wrist rest is genuinely comfortable rather than an afterthought.' },
    { productKey: 'apex5', userKey: 'kofi', rating: 3, comment: 'Solid board but the hybrid switches feel mushier than a real mechanical. Fine for gaming, less good for long writing sessions.' },
    { productKey: 'k380', userKey: 'sam', rating: 4, comment: 'Lives in my laptop bag permanently. Switching between the iPad and the work laptop mid-sentence still feels like a trick.' },
    { productKey: 'magicforce', userKey: 'lena', rating: 5, comment: 'Bought this as a first mechanical on a budget and it punches well above the price. Arrow keys on a compact board are non-negotiable for me.' },
    { productKey: 'aviator', userKey: 'kofi', rating: 5, comment: 'Arrived better finished than the photos suggest. The brass weight makes it feel like a much more expensive object than it is.' },
    { productKey: 'magic', userKey: 'lena', rating: 3, comment: 'Does exactly what Apple hardware does — looks lovely, works flawlessly, and has almost no key travel. Depends entirely on what you like.' },
    { productKey: 'corsair', userKey: 'sam', rating: 4, comment: 'The media wheel is the feature I did not know I wanted. Lighting software is heavier than it needs to be.' }
];

/**
 * Orders cover the states the dashboards branch on, so no table renders empty
 * on a fresh install: delivered, paid-and-waiting, placed-but-unpaid,
 * cancelled-with-refund, and one spanning two sellers where only half has
 * shipped — which is what the per-item delivery flags exist for.
 *
 * `daysAgo` backdates createdAt so the lists have a believable ordering.
 * Totals are computed by the runner from the same rules the order controller
 * uses, so they cannot drift out of sync with the real checkout maths.
 */
const orders = [
    {
        buyerKey: 'kofi',
        daysAgo: 21,
        items: [
            { productKey: 'k8', qty: 1, delivered: true },
            { productKey: 'k380', qty: 1, delivered: true }
        ],
        shippingAddress: { address: '14 Ring Road East', city: 'Accra', postalCode: 'GA-184-2371', country: 'Ghana' },
        isPaid: true,
        stockReserved: true
    },
    {
        buyerKey: 'lena',
        daysAgo: 9,
        items: [{ productKey: 'apex5', qty: 1, delivered: false }],
        shippingAddress: { address: '2201 Cedar Springs Rd', city: 'Dallas', postalCode: '75201', country: 'United States' },
        isPaid: true,
        stockReserved: true
    },
    {
        // Spans two sellers. Artisan Bench has shipped its half; Peripheral
        // Depot has not, so the order stays "in progress" overall.
        buyerKey: 'lena',
        daysAgo: 5,
        items: [
            { productKey: 'aviator', qty: 1, delivered: true },
            { productKey: 'magic', qty: 1, delivered: false }
        ],
        shippingAddress: { address: '2201 Cedar Springs Rd', city: 'Dallas', postalCode: '75201', country: 'United States' },
        isPaid: true,
        stockReserved: true
    },
    {
        // Placed but never paid — the checkout page was abandoned, so nothing
        // is reserved and the buyer still sees a Pay Now button.
        buyerKey: 'sam',
        daysAgo: 2,
        items: [{ productKey: 'hhkb', qty: 1, delivered: false }],
        shippingAddress: { address: '47 Blackfriars Road', city: 'London', postalCode: 'SE1 8NZ', country: 'United Kingdom' },
        isPaid: false,
        stockReserved: false
    },
    {
        // Paid, then cancelled and refunded in full. Stock went back on the
        // shelf, which is why stockReserved is false despite isPaid.
        buyerKey: 'kofi',
        daysAgo: 13,
        items: [{ productKey: 'corsair', qty: 1, delivered: false }],
        shippingAddress: { address: '14 Ring Road East', city: 'Accra', postalCode: 'GA-184-2371', country: 'Ghana' },
        isPaid: true,
        stockReserved: false,
        cancelled: true,
        cancelReason: 'Ordered the wrong switch type',
        refunded: true
    }
];

module.exports = { DEMO_PASSWORD, users, products, reviews, orders };
