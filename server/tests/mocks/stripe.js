const Stripe = require('stripe');

/**
 * Stand-in for config/stripe.js, wired up by an alias in vitest.config.mjs so
 * every `require('../config/stripe')` in the app resolves here during tests.
 * One place, no per-file mocking, and nothing can reach the network.
 *
 * This is a stateful fake rather than a set of bare stubs, because the app's
 * correctness depends on Stripe's *semantics*, not just on calls happening:
 *   - a session is 'open' until completed or expired, and only an open one
 *     can be expired — that's what "cancelling voids the session" relies on
 *   - refunding an already-refunded payment fails — which is exactly what
 *     makes the webhook's auto-refund backstop safe to replay
 * Modelling those rules means the tests actually exercise that reasoning.
 *
 * Webhook signature verification is deliberately left REAL: it's pure local
 * crypto, and stubbing it would gut the one guarantee that endpoint exists
 * to provide.
 */
const realStripeForCrypto = Stripe('sk_test_fake_key_for_tests');

const sessions = new Map();
const refundsByPaymentIntent = new Map();
let counter = 0;

const nextId = (prefix) => `${prefix}_test_${++counter}`;

const stripeMock = {
    webhooks: realStripeForCrypto.webhooks,

    checkout: {
        sessions: {
            async create({ metadata, expires_at } = {}) {
                const session = {
                    id: nextId('cs'),
                    url: 'https://checkout.stripe.com/c/pay/cs_test_fake',
                    status: 'open',
                    // Real sessions carry this from creation; it only flips to
                    // 'paid' once the buyer actually completes checkout.
                    payment_status: 'unpaid',
                    metadata,
                    expires_at
                };
                sessions.set(session.id, session);
                return session;
            },

            async retrieve(id) {
                const session = sessions.get(id);
                if (!session) {
                    throw new Error(`No such checkout session: ${id}`);
                }
                return session;
            },

            async expire(id) {
                const session = sessions.get(id);
                if (!session) {
                    throw new Error(`No such checkout session: ${id}`);
                }
                if (session.status !== 'open') {
                    // Real Stripe refuses to expire a session that's already
                    // finished — the app treats this as best-effort.
                    throw new Error(`Session ${id} is already ${session.status}`);
                }
                session.status = 'expired';
                return session;
            }
        }
    },

    refunds: {
        async create({ payment_intent }) {
            if (!payment_intent) {
                throw new Error('No payment_intent supplied');
            }
            if (refundsByPaymentIntent.has(payment_intent)) {
                // Mirrors Stripe's charge_already_refunded, which is what
                // makes a replayed webhook a safe no-op.
                throw new Error(`Charge for ${payment_intent} has already been refunded`);
            }

            const refund = {
                id: nextId('re'),
                amount: 10000, // cents, as Stripe reports; the app divides by 100
                status: 'succeeded',
                payment_intent
            };
            refundsByPaymentIntent.set(payment_intent, refund);
            return refund;
        }
    },

    // --- test-only inspection helpers -----------------------------------
    __getSession: (id) => sessions.get(id),
    __countRefunds: () => refundsByPaymentIntent.size,
    __getRefund: (paymentIntent) => refundsByPaymentIntent.get(paymentIntent),
    /** Models the buyer completing checkout: the session settles and a
     *  payment intent comes into existence. */
    __markSessionComplete: (id) => {
        const session = sessions.get(id);
        if (session) {
            session.status = 'complete';
            session.payment_status = 'paid';
            session.payment_intent = session.payment_intent || nextId('pi');
        }
        return session;
    },
    __reset() {
        sessions.clear();
        refundsByPaymentIntent.clear();
    }
};

module.exports = stripeMock;
